import os

# 1. المجلدات التي سيتم تجاهلها (تم إضافة مجلدات الذكاء الاصطناعي والاختبارات لتقليل الحجم)
IGNORE_DIRS = {
    'node_modules', 'vendor', 'storage', 'bootstrap', 'public',
    'venv', 'env', '__pycache__', '.git', '.next', '.supabase',
    'build', 'dist', '.agents', '.claude', '.ai', 'tests'
}

# 2. امتدادات الملفات (تم إزالة .md حتى لا يقرأ ملفات الشرح الطويلة)
ALLOWED_EXTENSIONS = {
    '.php', '.js', '.jsx', '.ts', '.tsx', '.json',
    '.sql', '.env.example', '.html', '.css'
}

# 3. الملفات التي لا نريد قراءتها 
IGNORE_FILES = {'package-lock.json', 'yarn.lock', 'poetry.lock', '.env'}

def generate_project_summary(root_dir, output_filename="project_context.txt"):
    with open(output_filename, 'w', encoding='utf-8') as outfile:
        
        outfile.write("### هيكل مجلدات المشروع (Project Tree) ###\n\n")
        
        # رسم هيكل المشروع
        for dirpath, dirnames, filenames in os.walk(root_dir):
            # إزالة المجلدات المستبعدة
            dirnames[:] = [d for d in dirnames if d not in IGNORE_DIRS]
            
            level = dirpath.replace(root_dir, '').count(os.sep)
            indent = ' ' * 4 * level
            outfile.write(f"{indent}{os.path.basename(dirpath)}/\n")
            
            sub_indent = ' ' * 4 * (level + 1)
            for f in filenames:
                if any(f.endswith(ext) for ext in ALLOWED_EXTENSIONS) and f not in IGNORE_FILES:
                    outfile.write(f"{sub_indent}{f}\n")
                    
        outfile.write("\n\n" + "="*50 + "\n\n")
        outfile.write("### أكواد ومحتويات الملفات (File Contents) ###\n\n")
        
        # قراءة محتوى الملفات
        for dirpath, dirnames, filenames in os.walk(root_dir):
            dirnames[:] = [d for d in dirnames if d not in IGNORE_DIRS]
            
            for filename in filenames:
                if filename in IGNORE_FILES:
                    continue
                    
                if any(filename.endswith(ext) for ext in ALLOWED_EXTENSIONS):
                    file_path = os.path.join(dirpath, filename)
                    relative_path = os.path.relpath(file_path, root_dir)
                    
                    try:
                        with open(file_path, 'r', encoding='utf-8') as infile:
                            content = infile.read()
                            
                        outfile.write(f"--- File: {relative_path} ---\n")
                        outfile.write("```\n")
                        outfile.write(content)
                        outfile.write("\n```\n\n")
                    except Exception as e:
                        outfile.write(f"--- File: {relative_path} (تعذر القراءة: {str(e)}) ---\n\n")

if __name__ == "__main__":
    # تشغيل السكربت في نفس المجلد الذي يتواجد فيه
    current_directory = os.getcwd()
    generate_project_summary(current_directory, "project_context_for_gemini.txt")
    print("تم تجميع المشروع بنجاح في ملف: project_context_for_gemini.txt")