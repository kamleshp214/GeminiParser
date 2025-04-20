import os
import json
import google.generativeai as genai
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Configure Gemini API with key from environment variables
api_key = os.getenv('GEMINI_API_KEY')
if api_key:
    genai.configure(api_key=api_key)

def analyze_with_gemini(resume_text, job_role, candidate_name=""):
    """
    Analyze resume text using Gemini API to extract structured information,
    calculate ATS compatibility score, and generate improvement suggestions.
    
    Args:
        resume_text (str): The raw text extracted from the resume
        job_role (str): The selected job role for ATS scoring
        candidate_name (str): User-provided candidate name (optional)
        
    Returns:
        dict: Enhanced resume data with ATS score and suggestions
    """
    if not api_key:
        return fallback_analysis(resume_text, job_role, candidate_name)
    
    try:
        # Initialize Gemini model (using the free tier model)
        model = genai.GenerativeModel("gemini-1.5-flash")
        
        # Create prompt for resume analysis
        prompt = create_analysis_prompt(resume_text, job_role, candidate_name)
        
        # Generate content with Gemini API
        response = model.generate_content(prompt)
        
        # Process and structure the response
        return process_gemini_response(response, candidate_name)
        
    except Exception as e:
        print(f"Gemini API error: {str(e)}")
        # Fallback to basic analysis if API fails
        return fallback_analysis(resume_text, job_role, candidate_name)

def create_analysis_prompt(resume_text, job_role, candidate_name=""):
    """Create a detailed prompt for Gemini to analyze the resume"""
    name_hint = f"\nCandidate name (if provided): {candidate_name}" if candidate_name else ""
    
    prompt = f"""
    TASK: Analyze this resume text for a BTech student applying for the role of {job_role}.
    {name_hint}
    
    RESUME TEXT:
    {resume_text}
    
    EXTRACT THE FOLLOWING IN JSON FORMAT:
    1. name (string): Candidate's full name {f'(use "{candidate_name}" if it matches the resume)' if candidate_name else ''}
    2. email (string): Email address
    3. phone (string): Phone number
    4. education (array of objects): Each with degree (string), institution (string), year (string)
    5. experience (array of objects): Each with title (string), company (string), dates (string), responsibilities (string)
    6. skills (array of strings): Technical and soft skills
    7. certifications (array of strings): Professional certifications
    8. ats_score (number): Score from 0-100 on how well the resume matches the {job_role} role
    9. suggestions (array of strings): 3-5 specific suggestions to improve the resume for the {job_role} role
    
    FORMAT:
    Return ONLY a valid JSON object with the above fields. Do not include any explanations or markdown formatting.
    Make sure to escape any special characters in the JSON.
    """
    
    return prompt

def process_gemini_response(response, candidate_name=""):
    """Process and validate the response from Gemini API"""
    # Extract text content from response
    content = response.text
    
    # Try to parse as JSON
    try:
        # Find JSON object in the response if it's wrapped in other text
        json_start = content.find('{')
        json_end = content.rfind('}') + 1
        
        if json_start >= 0 and json_end > json_start:
            json_str = content[json_start:json_end]
            parsed_data = json.loads(json_str)
            
            # Validate required fields
            required_fields = ["name", "email", "phone", "education", "experience", 
                              "skills", "ats_score", "suggestions"]
            
            for field in required_fields:
                if field not in parsed_data:
                    parsed_data[field] = "" if field in ["name", "email", "phone"] else []
            
            # Override with provided name if available and valid
            if candidate_name and not parsed_data.get("name"):
                parsed_data["name"] = candidate_name
                
            return parsed_data
            
    except json.JSONDecodeError:
        print("Failed to parse Gemini response as JSON")
    except Exception as e:
        print(f"Error processing Gemini response: {str(e)}")
    
    # Return a basic structure if parsing fails
    return fallback_analysis(None, None, candidate_name)

def fallback_analysis(resume_text, job_role, candidate_name=""):
    """Provide a basic analysis structure when Gemini API fails"""
    # This is a placeholder structure used when the API is unavailable
    return {
        "ats_score": 50,  # Default mid-range score
        "suggestions": [
            "Add more quantifiable achievements",
            "Include keywords relevant to the job description",
            "Ensure contact information is clearly visible",
            "Structure your resume with clear section headings",
            "Proofread for any spelling or grammatical errors"
        ]
    }