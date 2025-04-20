import os
import re
from werkzeug.utils import secure_filename

# Handle different file types
def process_file(file_path):
    """Extract text from various file types (PDF, DOCX, TXT)"""
    file_extension = os.path.splitext(file_path)[1].lower()
    
    if file_extension == '.pdf':
        return extract_from_pdf(file_path)
    elif file_extension == '.docx':
        return extract_from_docx(file_path)
    elif file_extension == '.txt':
        return extract_from_txt(file_path)
    else:
        raise ValueError(f"Unsupported file type: {file_extension}")

def extract_from_pdf(file_path):
    """Extract text from PDF files"""
    try:
        import pdfplumber
        text = ""
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                text += page.extract_text() or ""
        return text
    except ImportError:
        # Fallback to PyPDF2 if pdfplumber not available
        import PyPDF2
        text = ""
        with open(file_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            for page_num in range(len(pdf_reader.pages)):
                text += pdf_reader.pages[page_num].extract_text() or ""
        return text

def extract_from_docx(file_path):
    """Extract text from DOCX files"""
    import docx
    doc = docx.Document(file_path)
    full_text = []
    for para in doc.paragraphs:
        full_text.append(para.text)
    return '\n'.join(full_text)

def extract_from_txt(file_path):
    """Extract text from TXT files"""
    with open(file_path, 'r', encoding='utf-8', errors='ignore') as file:
        return file.read()

def clean_text(text):
    """Clean and normalize extracted text"""
    # Replace multiple whitespaces with a single space
    text = re.sub(r'\s+', ' ', text)
    # Remove unnecessary line breaks
    text = re.sub(r'[\n\r]+', '\n', text)
    # Remove URLs
    text = re.sub(r'https?://\S+', '', text)
    # Remove email signatures and other common irrelevant content
    text = re.sub(r'(?i)sent from my (iphone|android|blackberry|ipad|samsung)', '', text)
    return text.strip()

def is_valid_file(filename):
    """Check if file type is supported"""
    allowed_extensions = {'.pdf', '.docx', '.txt'}
    return os.path.splitext(filename)[1].lower() in allowed_extensions

def validate_file_size(file_path, max_size_mb=5):
    """Validate file size"""
    file_size = os.path.getsize(file_path) / (1024 * 1024)  # Convert to MB
    return file_size <= max_size_mb