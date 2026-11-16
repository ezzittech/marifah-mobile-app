<?php
/**
 * Marifah App API - Odoo Live Connection & Billplz Direct Integration
 */
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') { http_response_code(200); exit; }

define('ODOO_URL',  'https://portal.marifah.edu.my');
define('ODOO_DB',   'Marifahdb');
define('ODOO_USER', 'ezzittech@gmail.com');
define('ODOO_PASS', 'Abulez@2526');
$SID = null;

function odoo_post(string $path, array $payload): array {
    global $SID;
    $ch = curl_init(ODOO_URL . $path);
    $headers = ['Content-Type: application/json'];
    if ($SID) $headers[] = 'Cookie: session_id=' . $SID;
    curl_setopt_array($ch, [
        CURLOPT_POST => true, CURLOPT_POSTFIELDS => json_encode($payload),
        CURLOPT_HTTPHEADER => $headers, CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HEADER => true, CURLOPT_TIMEOUT => 60,
        CURLOPT_SSL_VERIFYPEER => false, CURLOPT_SSL_VERIFYHOST => 0
    ]);
    $raw = curl_exec($ch);
    if ($raw === false) throw new Exception("cURL Error: " . curl_error($ch));
    $hlen = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
    curl_close($ch);
    if (preg_match('/session_id=([^;]+)/i', substr($raw, 0, $hlen), $m)) $SID = $m[1];
    return json_decode(substr($raw, $hlen), true) ?? [];
}

function odoo_auth(): bool {
    $j = odoo_post('/web/session/authenticate', [
        'jsonrpc' => '2.0', 'method' => 'call', 'id' => 1,
        'params' => ['db' => ODOO_DB, 'login' => ODOO_USER, 'password' => ODOO_PASS]
    ]);
    if (isset($j['error'])) throw new Exception("Odoo Auth Error");
    return !empty($j['result']['uid']);
}

function odoo_call(string $model, string $method, array $args, array $kwargs=[]) {
    $j = odoo_post('/web/dataset/call_kw', [
        'jsonrpc'=>'2.0','method'=>'call','id'=>1,
        'params'=>['model'=>$model,'method'=>$method,'args'=>$args, 'kwargs'=>array_merge($kwargs,['context'=>[]])]
    ]);
    if (!empty($j['error'])) throw new Exception($j['error']['data']['message'] ?? 'Odoo Error');
    return $j['result'] ?? [];
}

$input = json_decode(file_get_contents('php://input'), true);
$action = $input['action'] ?? '';

// ==========================================
// ACTION 1: تسجيل الدخول
// ==========================================
if ($action === 'login') {
    $student_id = trim($input['student_id'] ?? '');
    if (empty($student_id)) { echo json_encode(['success'=>false, 'message'=>'رقم الطالب مطلوب']); exit; }

    try {
        if (!odoo_auth()) throw new Exception("تعذر الاتصال بالنظام.");

        $domain = [['x_student_number', '=', $student_id]]; 
        $partners = odoo_call('res.partner', 'search_read', [$domain], ['fields' => ['id', 'name', 'x_student_number'], 'limit' => 1]);
        if (empty($partners)) throw new Exception("لم يتم العثور على طالب برقم القيد (".$student_id.")");
        
        $partner_id = $partners[0]['id'];
        
        $move_domain = [['partner_id', '=', $partner_id], ['move_type', '=', 'out_invoice'], ['state', '=', 'posted']];
        $moves = odoo_call('account.move', 'search_read', [$move_domain], [
            'fields' => ['name', 'invoice_date', 'amount_total', 'amount_residual', 'payment_state'],
            'order'  => 'invoice_date desc', 'limit'  => 0
        ]);

        $invoices = []; $total_due = 0.0;
        foreach ($moves as $move) {
            $residual = (float)$move['amount_residual'];
            $total_due += $residual;
            $status = ($move['payment_state'] === 'paid' || $move['payment_state'] === 'in_payment' || $residual <= 0) ? 'paid' : 'unpaid';
            $invoices[] = [
                'id' => $move['name'], 'title' => 'Tuition Fee / رسوم دراسية', 
                'date' => $move['invoice_date'], 'amount' => (float)$move['amount_total'], 'status' => $status
            ];
        }

        echo json_encode(['success' => true, 'data' => [
            'student_id' => $student_id, 'name' => $partners[0]['name'],
            'finance' => ['total_due' => $total_due, 'invoices' => $invoices],
            'academic' => ['attendance_rate' => 89.5, 'days_present' => 52, 'days_absent' => 2, 'grades' => [['subject' => 'Math', 'score' => 90, 'grade' => 'A', 'teacher' => 'Fedena Mock']]]
        ]]);
    } catch (Exception $e) { echo json_encode(['success' => false, 'message' => $e->getMessage()]); }
    exit;
}

// ==========================================
// ACTION 2: توليد رابط الدفع مباشرة من Billplz
// ==========================================
if ($action === 'get_payment_link') {
    $student_id = trim($input['student_id'] ?? '');
    $invoice_name = trim($input['invoice_id'] ?? '');

    try {
        if (!odoo_auth()) throw new Exception("تعذر الاتصال بالنظام.");

        // 1. جلب بيانات العميل والفاتورة
        $partners = odoo_call('res.partner', 'search_read', [[['x_student_number', '=', $student_id]]], ['fields' => ['id', 'name', 'email'], 'limit' => 1]);
        if (empty($partners)) throw new Exception("الطالب غير موجود.");
        $partner_id = $partners[0]['id'];
        $partner_name = $partners[0]['name'];
        $partner_email = $partners[0]['email'] ?: 'student@marifah.edu.my';

        $moves = odoo_call('account.move', 'search_read', [[['name', '=', $invoice_name], ['partner_id', '=', $partner_id], ['state', '=', 'posted']]], ['fields' => ['id', 'amount_residual', 'currency_id'], 'limit' => 1]);
        if (empty($moves)) throw new Exception("الفاتورة غير موجودة.");
        
        $invoice_id = $moves[0]['id'];
        $amount_residual = (float)$moves[0]['amount_residual'];
        $currency_id = $moves[0]['currency_id'][0];
        
        if ($amount_residual <= 0) throw new Exception("هذه الفاتورة مدفوعة بالكامل.");

        // 2. جلب مفاتيح Billplz من Odoo
        $providers = odoo_call('payment.provider', 'search_read', [[['code', '=', 'billplz'], ['state', 'in', ['enabled', 'test']]]], ['fields' => ['id', 'billplz_api_key', 'billplz_collection_id', 'billplz_sandbox'], 'limit' => 1]);
        if (empty($providers)) throw new Exception("بوابة الدفع غير مفعلة.");
        
        $provider_id = $providers[0]['id'];
        $billplz_api_key = $providers[0]['billplz_api_key'];
        $billplz_collection_id = $providers[0]['billplz_collection_id'];
        $is_sandbox = $providers[0]['billplz_sandbox'];

        $pm_data = odoo_call('ir.model.data', 'search_read', [[['module', '=', 'payment_billplz'], ['name', '=', 'payment_method_billplz']]], ['fields' => ['res_id'], 'limit' => 1]);
        $pm_id = $pm_data[0]['res_id'];

        // 3. إنشاء حركة الدفع (Draft) في أودوو
        $tx_ref = $invoice_name . '-' . time();
        $tx_id = odoo_call('payment.transaction', 'create', [[
            'provider_id' => $provider_id,
            'payment_method_id' => $pm_id,
            'reference' => $tx_ref,
            'amount' => $amount_residual,
            'currency_id' => $currency_id,
            'partner_id' => $partner_id,
            'operation' => 'online_redirect',
            'state' => 'draft',
            'invoice_ids' => [[4, $invoice_id]]
        ]]);

        // 4. إنشاء الفاتورة في Billplz عبر API مباشرة
        $billplz_endpoint = $is_sandbox ? 'https://www.billplz-sandbox.com/api/v3/bills' : 'https://www.billplz.com/api/v3/bills';
        $amount_cents = (int)round($amount_residual * 100);

        $billplz_payload = [
            'collection_id' => $billplz_collection_id,
            'email' => $partner_email,
            'name' => $partner_name,
            'amount' => $amount_cents,
            'callback_url' => ODOO_URL . '/payment/billplz/webhook',
            'redirect_url' => ODOO_URL . '/payment/billplz/return?ref=' . $tx_ref,
            'description' => 'Payment for ' . $invoice_name,
            'reference_1_label' => 'Reference',
            'reference_1' => $tx_ref
        ];

        $ch = curl_init($billplz_endpoint);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_USERPWD, $billplz_api_key . ':');
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($billplz_payload));
        
        $response = curl_exec($ch);
        $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($http_code != 200) throw new Exception("فشل الاتصال بـ Billplz: " . $response);

        $billplz_data = json_decode($response, true);
        $bill_id = $billplz_data['id'] ?? '';
        $payment_url = $billplz_data['url'] ?? '';

        if (empty($bill_id) || empty($payment_url)) throw new Exception("استجابة غير صحيحة من بوابة الدفع.");

        // 5. تحديث حركة الدفع في أودوو برقم وتفاصيل فاتورة Billplz
        odoo_call('payment.transaction', 'write', [[$tx_id], [
            'billplz_bill_id' => $bill_id,
            'billplz_url' => $payment_url,
            'billplz_myr_amount' => $amount_residual
        ]]);

        echo json_encode(['success' => true, 'payment_url' => $payment_url]);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
    exit;
}

echo json_encode(['success' => false, 'message' => 'Invalid Request']);
?>