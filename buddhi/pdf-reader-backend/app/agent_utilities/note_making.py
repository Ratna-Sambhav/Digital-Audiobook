from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_JUSTIFY
from io import BytesIO
from google import genai
from google.genai import types
from dotenv import load_dotenv
from pydantic import BaseModel
import ast
import tempfile
import os

load_dotenv(override=True)
client = genai.Client()


class CornellCue(BaseModel):
    keywords: list[str]
    questions: list[str]
class CornellNotes(BaseModel):
    cues: CornellCue
    main_notes: list[str]
    summary: list[str] 

def generate_cornell_note_data(text: str) -> CornellNotes | str:

    try:
        response = client.models.generate_content(
            model="gemini-2.5-pro",
            contents=f"""Extract important points from the following provided text and write it in a cornell style note with cues 
                        containing a list of keywords and a list of questions, main_notes containing a list of main points and 
                        summary containing a list of sentences as final overall summary: {text}""",
            config={
                "response_mime_type": "application/json",
                "response_schema": CornellNotes,
            },
        )

        my_notes: CornellNotes = response.parsed
        return my_notes
    
    except Exception as e:
        return f"An error occured: {e}"



def generate_cornell_notes_pdf(raw_text_data, filename="cornell_notes.pdf"):
    """
    Generate a Cornell-style notes PDF and return the temporary file path.
    
    Args:
        notes_data: Dictionary with structure:
            {
                "cues": {
                    "keywords": [list of keywords],
                    "questions": [list of questions]
                },
                "main_notes": [list of note points],
                "summary": [list of summary points]
            }
        filename: Base filename (used for naming the temp file)
        
    Returns:
        str: Path to the temporary PDF file
        
    Note: For subscripts and superscripts in text, use:
        - <sub>text</sub> for subscripts (e.g., H<sub>2</sub>O)
        - <super>text</super> for superscripts (e.g., x<super>2</super>)
    """
    print("Generating notes....")
    notes_data_str = generate_cornell_note_data(raw_text_data).json()
    notes_data = ast.literal_eval(notes_data_str)

    # Create a temporary file
    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.pdf', prefix='cornell_notes_')
    temp_path = temp_file.name
    temp_file.close()

    # Create PDF document
    doc = SimpleDocTemplate(
        temp_path,
        pagesize=letter,
        rightMargin=0.5*inch,
        leftMargin=0.5*inch,
        topMargin=0.75*inch,
        bottomMargin=0.5*inch
    )
    
    # Container for PDF elements
    elements = []
    
    # Define styles
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=16,
        textColor=colors.HexColor('#2c3e50'),
        spaceAfter=12,
        alignment=TA_LEFT
    )
    
    cue_header_style = ParagraphStyle(
        'CueHeader',
        parent=styles['Heading2'],
        fontSize=11,
        textColor=colors.HexColor('#34495e'),
        spaceAfter=6,
        spaceBefore=6,
        bold=True
    )
    
    cue_style = ParagraphStyle(
        'CueText',
        parent=styles['Normal'],
        fontSize=9,
        textColor=colors.HexColor('#2c3e50'),
        spaceAfter=4,
        leading=12
    )
    
    notes_style = ParagraphStyle(
        'NotesText',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.HexColor('#2c3e50'),
        spaceAfter=6,
        leading=14,
        alignment=TA_JUSTIFY
    )
    
    summary_header_style = ParagraphStyle(
        'SummaryHeader',
        parent=styles['Heading2'],
        fontSize=11,
        textColor=colors.HexColor('#34495e'),
        spaceAfter=6,
        bold=True
    )
    
    summary_style = ParagraphStyle(
        'SummaryText',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.HexColor('#2c3e50'),
        spaceAfter=4,
        leading=14,
        alignment=TA_JUSTIFY
    )
    
    # Add title
    elements.append(Paragraph("Cornell Notes", title_style))
    elements.append(Spacer(1, 0.2*inch))
    
    # Prepare cues content (left sidebar)
    cues_content = []
    
    # Add keywords section
    if notes_data.get("cues", {}).get("keywords"):
        cues_content.append(Paragraph("<b>Keywords:</b>", cue_header_style))
        for keyword in notes_data["cues"]["keywords"]:
            cues_content.append(Paragraph(f"• {keyword}", cue_style))
        cues_content.append(Spacer(1, 0.15*inch))
    
    # Add questions section
    if notes_data.get("cues", {}).get("questions"):
        cues_content.append(Paragraph("<b>Questions:</b>", cue_header_style))
        for question in notes_data["cues"]["questions"]:
            cues_content.append(Paragraph(f"• {question}", cue_style))
    
    # Prepare main_notes content
    notes_content = []
    if notes_data.get("main_notes"):
        for note in notes_data["main_notes"]:
            notes_content.append(Paragraph(f"• {note}", notes_style))
    
    # Create table for cues and notes (two-column layout)
    table_data = [[cues_content, notes_content]]
    
    # Calculate available width
    available_width = doc.width
    cue_width = 2.0 * inch
    notes_width = available_width - cue_width
    
    notes_table = Table(
        table_data,
        colWidths=[cue_width, notes_width],
        style=TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('LINEBELOW', (0, 0), (-1, -1), 2, colors.HexColor('#34495e')),
            ('LINEAFTER', (0, 0), (0, -1), 2, colors.HexColor('#34495e')),
            ('BOX', (0, 0), (-1, -1), 2, colors.HexColor('#34495e')),
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#ecf0f1')),
        ])
    )
    
    elements.append(notes_table)
    elements.append(Spacer(1, 0.3*inch))
    
    # Add summary section (full width at bottom)
    if notes_data.get("summary"):
        # Create summary box
        summary_content = [[Paragraph("<b>Summary:</b>", summary_header_style)]]
        
        for summary_point in notes_data["summary"]:
            summary_content.append([Paragraph(f"• {summary_point}", summary_style)])
        
        summary_table = Table(
            summary_content,
            colWidths=[available_width],
            style=TableStyle([
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('LEFTPADDING', (0, 0), (-1, -1), 12),
                ('RIGHTPADDING', (0, 0), (-1, -1), 12),
                ('TOPPADDING', (0, 0), (-1, -1), 10),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
                ('BOX', (0, 0), (-1, -1), 2, colors.HexColor('#34495e')),
                ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f8f9fa')),
            ])
        )
        
        elements.append(summary_table)
    
    # Build PDF
    doc.build(elements)
    print(f"PDF generated successfully: {temp_path}")
    
    return temp_path


# Example usage with subscripts and superscripts
if __name__ == "__main__":
    sample_notes = {
        "cues": {
            "keywords": [
                "Photosynthesis",
                "Chlorophyll",
                "Light-dependent reactions",
                "Calvin cycle",
                "ATP synthesis"
            ],
            "questions": [
                "What is the role of chlorophyll in photosynthesis?",
                "How does light energy convert to chemical energy?",
                "What are the products of the light-dependent reactions?"
            ]
        },
        "main_notes": [
            "Photosynthesis is the process by which plants convert light energy into chemical energy stored in glucose molecules.",
            "The process occurs in two main stages: light-dependent reactions and light-independent reactions (Calvin cycle).",
            "Light-dependent reactions take place in the thylakoid membranes and produce ATP and NADPH.",
            "Chlorophyll absorbs light energy, primarily in the red and blue wavelengths, reflecting green light.",
            "The Calvin cycle uses ATP and NADPH to fix carbon dioxide into organic molecules.",
            "Water molecules are split during photosynthesis, releasing oxygen as a byproduct.",
            "The overall equation: 6CO<sub>2</sub> + 6H<sub>2</sub>O + light energy → C<sub>6</sub>H<sub>12</sub>O<sub>6</sub> + 6O<sub>2</sub>",
            "Chemical formula for benzene: C<sub>6</sub>H<sub>6</sub>",
            "Algebraic identity: a<super>2</super> - b<super>2</super> = (a - b)(a + b)"
        ],
        "summary": [
            "Photosynthesis is essential for life on Earth, converting solar energy into chemical energy that sustains food chains.",
            "The process involves two interconnected stages working together to produce glucose from carbon dioxide and water.",
            "Understanding photosynthesis is crucial for agriculture, climate science, and renewable energy research."
        ]
    }
    raw_text = """Arrival is based on the Nebula-winning 1998 science fiction novella 'Story of Your Life' by Ted Chiang. The novella involves Earth's first communication with heptapods who speak in a cryptic language. Screenwriter Eric Heisserer had been introduced to the story through another of Chiang's stories, 'Understand', and had begun reading Chiang's collected works when 'Story of Your Life' had a "profound emotional effect" on him. As a result, he tried to adapt the story into a film script as he wanted to share it with a wider audience.[11] After writing an initial spec script, Heisserer pitched it to production companies for several years without receiving any interest and nearly gave up on the project.[12] Heisserer believes it was not until he had successfully completed and produced 2013's Hours that others took interest in his work, he having proved himself capable.[11] Eventually, Dan Levine and Dan Cohen of 21 Laps Entertainment expressed interest in Heisserer's script. Shawn Levy of 21 Laps said they had become aware of "Story of Your Life" around 2011 and considered it a powerful work; when they learned of Heisserer's script adaptation, they started working closely with him, helping him refine the script before they began seeking a director and distribution studio.[13] One of the directors that 21 Laps approached was Denis Villeneuve. Villeneuve had wanted to make a science fiction film for some time, although he "never found the right thing".[14] Cohen and Levine introduced Villeneuve to the novella, which he immediately took to, although his work on Prisoners meant that he did not have the time to properly adapt it into a screenplay with Heisserer.[14] Heisserer completed a first draft, which he and Villeneuve reworked into the final script.[14] Villeneuve changed the title, as he felt the original sounded like a romantic comedy and that the script had become very different from the short story.[14] While Villeneuve went through "hundreds" of possible titles, Arrival was the first one his team of producers and writers had suggested.[14]"""
    generate_cornell_notes_pdf(raw_text, "first_notes_try.pdf")