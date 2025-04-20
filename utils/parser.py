import re
import spacy

# Load spaCy NER model
try:
    nlp = spacy.load("en_core_web_sm")
except:
    # Fallback to small model if the larger one isn't available
    nlp = spacy.load("en_core_web_sm")

def parse_resume(text, provided_name=""):
    """
    Parse resume text using basic NLP techniques.
    This serves as a fallback if the Gemini API fails.
    """
    # Initialize result structure
    result = {
        "name": "",
        "email": "",
        "phone": "",
        "education": [],
        "experience": [],
        "skills": [],
        "certifications": [],
        "additional_sections": {}
    }
    
    # Use provided name if available
    if provided_name and is_valid_name(provided_name):
        result["name"] = provided_name
    else:
        # Try to extract name using NER
        result["name"] = extract_name(text)
    
    # Extract contact information
    result["email"] = extract_email(text)
    result["phone"] = extract_phone(text)
    
    # Extract education details
    result["education"] = extract_education(text)
    
    # Extract work experience
    result["experience"] = extract_experience(text)
    
    # Extract skills
    result["skills"] = extract_skills(text)
    
    # Extract certifications
    result["certifications"] = extract_certifications(text)
    
    return result

def is_valid_name(name):
    """Validate if the provided name matches the expected format"""
    pattern = r'^[A-Z][a-z]+ [A-Z][a-z]+$'
    return bool(re.match(pattern, name))

def extract_name(text):
    """Extract name using spaCy NER"""
    doc = nlp(text[:1000])  # Process just the first 1000 chars for efficiency
    
    # Look for PERSON entities at the beginning of the document
    for ent in doc.ents:
        if ent.label_ == "PERSON":
            # Validate the name format (First Last)
            name = ent.text.strip()
            if re.match(r'^[A-Z][a-z]+ [A-Z][a-z]+$', name):
                return name
    
    # Fallback: Look for common name patterns at the top of the resume
    first_lines = text.split('\n')[:5]
    for line in first_lines:
        line = line.strip()
        if re.match(r'^[A-Z][a-z]+ [A-Z][a-z]+$', line):
            return line
    
    return "Unknown"  # Default if no name is found

def extract_email(text):
    """Extract email address using regex"""
    email_pattern = r'[\w.+-]+@[\w-]+\.[\w.-]+'
    matches = re.findall(email_pattern, text)
    return matches[0] if matches else ""

def extract_phone(text):
    """Extract phone number using regex"""
    # Match various phone number formats
    phone_pattern = r'(?:\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}'
    matches = re.findall(phone_pattern, text)
    return matches[0] if matches else ""

def extract_education(text):
    """Extract education information"""
    education = []
    
    # Common education keywords
    edu_keywords = [
        "Bachelor", "BTech", "B.Tech", "Master", "MTech", "M.Tech", 
        "PhD", "Ph.D", "Diploma", "College", "University", "Institute",
        "School of", "Academy"
    ]
    
    # Look for education section
    edu_section = extract_section(text, ["EDUCATION", "ACADEMIC BACKGROUND", "ACADEMIC CREDENTIALS"])
    
    if edu_section:
        # Process each line in the education section
        lines = edu_section.split('\n')
        current_edu = {}
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
                
            # Check if line contains degree information
            if any(keyword in line for keyword in edu_keywords):
                # Save previous entry if exists
                if current_edu and "degree" in current_edu:
                    education.append(current_edu)
                    
                # Start new entry
                current_edu = {"degree": "", "institution": "", "year": ""}
                
                # Extract degree
                current_edu["degree"] = line
                
                # Try to extract year
                year_match = re.search(r'(19|20)\d{2}[^\d]*(19|20)\d{2}|(?<!\d)(19|20)\d{2}(?!\d)', line)
                if year_match:
                    current_edu["year"] = year_match.group(0)
                    
                # Try to extract institution
                for keyword in ["University", "College", "Institute", "School"]:
                    if keyword in line:
                        parts = line.split(keyword)
                        if len(parts) > 1:
                            current_edu["institution"] = f"{keyword}{parts[1].split(',')[0]}"
        
        # Add the last education entry
        if current_edu and "degree" in current_edu:
            education.append(current_edu)
    
    return education

def extract_experience(text):
    """Extract work experience information"""
    experience = []
    
    # Extract experience section
    exp_section = extract_section(text, ["EXPERIENCE", "WORK EXPERIENCE", "PROFESSIONAL EXPERIENCE", "EMPLOYMENT"])
    
    if exp_section:
        # Split into potential job entries (assumption: separated by blank lines or dates)
        entries = re.split(r'\n\s*\n', exp_section)
        
        for entry in entries:
            if not entry.strip():
                continue
                
            # Initialize job entry
            job = {"title": "", "company": "", "dates": "", "responsibilities": ""}
            
            lines = entry.split('\n')
            
            # First line often contains title and company
            if lines:
                first_line = lines[0].strip()
                
                # Try to extract dates
                date_pattern = r'(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sept|Sep|Oct|Nov|Dec)[\s.,-]+\d{4}\s*[-–—]\s*((Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sept|Sep|Oct|Nov|Dec)[\s.,-]+\d{4}|Present|Current)'
                date_match = re.search(date_pattern, entry, re.IGNORECASE)
                if date_match:
                    job["dates"] = date_match.group(0)
                
                # Check for job title patterns (often has words like Manager, Engineer, etc.)
                title_patterns = ["Manager", "Engineer", "Developer", "Analyst", "Specialist", "Coordinator", "Director", "Assistant", "Lead", "Head"]
                for pattern in title_patterns:
                    if pattern in first_line:
                        job["title"] = first_line
                        break
                
                # If we haven't identified a title but have the first line, use it as title
                if not job["title"] and first_line:
                    job["title"] = first_line
            
            # Try to identify company name (often in second line or within parentheses)
            if len(lines) > 1:
                company_line = lines[1].strip()
                if "(" in company_line and ")" in company_line:
                    company_match = re.search(r'\((.*?)\)', company_line)
                    if company_match:
                        job["company"] = company_match.group(1)
                else:
                    job["company"] = company_line
            
            # Remaining lines are responsibilities
            if len(lines) > 2:
                job["responsibilities"] = "\n".join(lines[2:])
            
            experience.append(job)
    
    return experience

def extract_skills(text):
    """Extract skills using keyword matching"""
    # Common technical skills for BTech students
    technical_skills = [
        "Python", "Java", "C++", "JavaScript", "HTML", "CSS", "SQL", "React", 
        "Angular", "Vue", "Node.js", "Express", "Django", "Flask", "TensorFlow", 
        "PyTorch", "Scikit-learn", "Data Analysis", "Machine Learning", "AI",
        "Cloud Computing", "AWS", "Azure", "GCP", "Docker", "Kubernetes",
        "Git", "GitHub", "CI/CD", "DevOps", "Agile", "Scrum", "Testing",
        "Full Stack", "Frontend", "Backend", "Mobile Development", "Android",
        "iOS", "Swift", "Kotlin", "React Native", "Flutter", "UI/UX",
        "Database", "MongoDB", "PostgreSQL", "MySQL", "Oracle", "NoSQL",
        "REST API", "GraphQL", "Microservices", "System Design", "Algorithms",
        "Data Structures", "Big Data", "Hadoop", "Spark", "ETL", "Linux",
        "Unix", "Windows", "Networking", "Security", "Blockchain", "IoT"
    ]
    
    # Extract skills section
    skills_section = extract_section(text, ["SKILLS", "TECHNICAL SKILLS", "TECHNICAL PROFICIENCIES", "COMPETENCIES"])
    
    found_skills = []
    
    # If skills section found, extract skills
    if skills_section:
        # Check for each skill in the section
        for skill in technical_skills:
            if re.search(r'\b' + re.escape(skill) + r'\b', skills_section, re.IGNORECASE):
                found_skills.append(skill)
    else:
        # If no skills section, check entire text
        for skill in technical_skills:
            if re.search(r'\b' + re.escape(skill) + r'\b', text, re.IGNORECASE):
                found_skills.append(skill)
    
    return found_skills

def extract_certifications(text):
    """Extract certifications"""
    certifications = []
    
    # Extract certifications section
    cert_section = extract_section(text, ["CERTIFICATIONS", "CERTIFICATES", "CERTIFICATION", "PROFESSIONAL CERTIFICATIONS"])
    
    if cert_section:
        # Split by line and process each line as a potential certification
        lines = cert_section.split('\n')
        for line in lines:
            line = line.strip()
            if line and not line.lower() in ["certifications", "certificates"]:
                certifications.append(line)
    
    return certifications

def extract_section(text, section_headers):
    """
    Extract a section from the resume text based on common section headers.
    Returns the text of the specified section.
    """
    # Create regex pattern for section headers
    pattern = r'(?i)(?:^|\n)((?:{})(?:s|:|\s)*)(?:\n|\:)(.*?)(?=\n(?:\w+(?:s|:|\s)*\n|\Z))'.format('|'.join(section_headers))
    
    # Try to find the section
    match = re.search(pattern, text, re.DOTALL | re.IGNORECASE)
    if match:
        return match.group(2).strip()
    
    # Alternative approach: split by capitalized section headers
    for header in section_headers:
        # Look for the header followed by a newline or colon
        header_pattern = r'(?i)(?:^|\n){}(?:s|:|\s)*(?:\n|\:)'.format(re.escape(header))
        match = re.search(header_pattern, text)
        
        if match:
            # Get the text after this header until the next potential header
            start_pos = match.end()
            next_header_match = re.search(r'\n[A-Z][A-Z\s]+(?:\n|:)', text[start_pos:])
            
            if next_header_match:
                end_pos = start_pos + next_header_match.start()
                return text[start_pos:end_pos].strip()
            else:
                return text[start_pos:].strip()
    
    return ""  # Return empty string if section not found