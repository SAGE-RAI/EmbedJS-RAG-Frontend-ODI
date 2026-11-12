
/**
 * author: joseph.kwarteng@open.ac.uk
 * created on: 21-05-2026-11h-55m
 * github: https://github.com/kwartengj
 * copyright 2026
*/

const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, 
        AlignmentType, HeadingLevel, BorderStyle, WidthType, ShadingType, LevelFormat } = require('docx');
const fs = require('fs');
 
const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const borders = { top: border, bottom: border, left: border, right: border };
 
const doc = new Document({
  styles: {
    default: { 
      document: { 
        run: { font: "Arial", size: 24 } 
      } 
    },
    paragraphStyles: [
      { 
        id: "Heading1", 
        name: "Heading 1", 
        basedOn: "Normal", 
        next: "Normal", 
        quickFormat: true,
        run: { size: 32, bold: true, font: "Arial", color: "003366" },
        paragraph: { spacing: { before: 360, after: 240 }, outlineLevel: 0 }
      },
      { 
        id: "Heading2", 
        name: "Heading 2", 
        basedOn: "Normal", 
        next: "Normal", 
        quickFormat: true,
        run: { size: 28, bold: true, font: "Arial", color: "003366" },
        paragraph: { spacing: { before: 300, after: 180 }, outlineLevel: 1 }
      },
      { 
        id: "Heading3", 
        name: "Heading 3", 
        basedOn: "Normal", 
        next: "Normal", 
        quickFormat: true,
        run: { size: 26, bold: true, font: "Arial", color: "003366" },
        paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 2 }
      },
    ]
  },
  numbering: {
    config: [
      {
        reference: "bullets",
        levels: [
          { 
            level: 0, 
            format: LevelFormat.BULLET, 
            text: "•", 
            alignment: AlignmentType.LEFT,
            style: { 
              paragraph: { 
                indent: { left: 720, hanging: 360 } 
              } 
            } 
          }
        ]
      },
      {
        reference: "numbering",
        levels: [
          { 
            level: 0, 
            format: LevelFormat.DECIMAL, 
            text: "%1.", 
            alignment: AlignmentType.LEFT,
            style: { 
              paragraph: { 
                indent: { left: 720, hanging: 360 } 
              } 
            } 
          }
        ]
      }
    ]
  },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
      }
    },
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text: "TM342: Teaching Strategy and Pedagogy",
            bold: true,
            size: 36,
            color: "003366"
          })
        ],
        spacing: { after: 120 },
        alignment: AlignmentType.CENTER
      }),
 
      new Paragraph({
        children: [
          new TextRun({
            text: "Adaptive Design for a Rapidly Changing Field",
            size: 28,
            color: "666666"
          })
        ],
        spacing: { after: 480 },
        alignment: AlignmentType.CENTER
      }),
 
      // Executive Summary
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun("Executive Summary")]
      }),
 
      new Paragraph({
        children: [
          new TextRun({
            text: "This teaching strategy addresses the unique challenge of teaching AI in Society: the field evolves faster than traditional curriculum development cycles. Rather than creating static content that becomes outdated, we employ a "
          }),
          new TextRun({
            text: "modular, principles-based pedagogy",
            bold: true
          }),
          new TextRun({
            text: " where stable conceptual frameworks serve as anchors while examples, case studies, and current events can be rapidly updated. This approach ensures the module remains relevant without requiring wholesale redevelopment."
          })
        ],
        spacing: { after: 360 }
      }),
 
      // Core Principle
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun("Core Pedagogical Principle")]
      }),
 
      new Paragraph({
        children: [
          new TextRun({
            text: "Separate the Stable from the Volatile",
            bold: true,
            size: 28,
            color: "003366"
          })
        ],
        spacing: { after: 180 }
      }),
 
      new Paragraph({
        children: [
          new TextRun({
            text: "STABLE ELEMENTS (update every 3-5 years):",
            bold: true
          })
        ],
        spacing: { after: 80 }
      }),
 
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Conceptual frameworks (sociotechnical analysis, ethical reasoning, power analysis)")]
      }),
 
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Analytical methods and critical thinking approaches")]
      }),
 
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Historical context and genealogies of concepts")]
      }),
 
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Foundational readings (Benjamin, Crawford, Noble, Eubanks)")]
      }),
 
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Assessment structures and learning outcomes")]
      }),
 
      new Paragraph({ text: "", spacing: { after: 180 } }),
 
      new Paragraph({
        children: [
          new TextRun({
            text: "VOLATILE ELEMENTS (update 2-3 times per year):",
            bold: true
          })
        ],
        spacing: { after: 80 }
      }),
 
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Current AI systems and technologies")]
      }),
 
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Case studies of recent controversies")]
      }),
 
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("News articles and investigative journalism")]
      }),
 
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Policy developments and regulatory changes")]
      }),
 
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Corporate controversies and worker organizing")]
      }),
 
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Statistics and quantitative data")]
      }),
 
      new Paragraph({ text: "", spacing: { after: 360 } }),
 
      // Modular Content Architecture
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun("Modular Content Architecture")]
      }),
 
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("Three-Tier Structure")]
      }),
 
      // Tier 1
      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun("Tier 1: Core Module Materials (Static)")]
      }),
 
      new Paragraph({
        children: [
          new TextRun({
            text: "Update frequency: Every 3-5 years or major module revision",
            italics: true
          })
        ],
        spacing: { after: 120 }
      }),
 
      new Paragraph({
        children: [new TextRun("Content:")],
        spacing: { after: 80 }
      }),
 
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Module guide with learning outcomes and assessment criteria")]
      }),
 
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Core readings (books and seminal papers)")]
      }),
 
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Conceptual framework explanations")]
      }),
 
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Analytical tools and methods guides")]
      }),
 
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Historical context sections")]
      }),
 
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Assignment templates and rubrics")]
      }),
 
      new Paragraph({ text: "", spacing: { after: 120 } }),
 
      new Paragraph({
        children: [
          new TextRun({
            text: "Teaching approach:",
            bold: true
          }),
          new TextRun({
            text: " Traditional OU study units with printed and digital versions. These provide the stable intellectual foundation."
          })
        ],
        spacing: { after: 180 }
      }),
 
      // Tier 2
      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun("Tier 2: Curated Case Study Bank (Semi-Dynamic)")]
      }),
 
      new Paragraph({
        children: [
          new TextRun({
            text: "Update frequency: 2-3 times per year",
            italics: true
          })
        ],
        spacing: { after: 120 }
      }),
 
      new Paragraph({
        children: [new TextRun("Content:")],
        spacing: { after: 80 }
      }),
 
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Detailed case studies (5-10 pages each) with embedded analysis questions")]
      }),
 
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Each case study demonstrates application of core frameworks to current examples")]
      }),
 
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Structured format: Background → Technical Details → Social Impact → Ethical Analysis → Discussion Questions → Further Resources")]
      }),
 
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Each case study includes 'Last Updated' date and version number")]
      }),
 
      new Paragraph({ text: "", spacing: { after: 120 } }),
 
      new Paragraph({
        children: [
          new TextRun({
            text: "Teaching approach:",
            bold: true
          }),
          new TextRun({
            text: " Digital repository accessible through VLE. Students select from rotating collection. Older cases remain available for historical comparison."
          })
        ],
        spacing: { after: 120 }
      }),
 
      new Paragraph({
        children: [
          new TextRun({
            text: "Examples of case studies:",
            bold: true
          })
        ],
        spacing: { after: 80 }
      }),
 
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("'Amazon's Hiring Algorithm: Gender Discrimination at Scale' (updated 2023)")]
      }),
 
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("'COMPAS Risk Assessment: Racial Bias in Criminal Justice' (updated 2024)")]
      }),
 
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("'ChatGPT and Generative AI: Labor, Copyright, and Environmental Costs' (updated 2025)")]
      }),
 
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("'Facial Recognition Bans: Organizing Against Surveillance' (updated 2024)")]
      }),
 
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("'UK Post Office Horizon Scandal: Algorithmic Accountability Failure' (updated 2025)")]
      }),
 
      new Paragraph({ text: "", spacing: { after: 180 } }),
 
      // Tier 3
      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun("Tier 3: Current Events Stream (Highly Dynamic)")]
      }),
 
      new Paragraph({
        children: [
          new TextRun({
            text: "Update frequency: Weekly during teaching period",
            italics: true
          })
        ],
        spacing: { after: 120 }
      }),
 
      new Paragraph({
        children: [new TextRun("Content:")],
        spacing: { after: 80 }
      }),
 
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("News articles and blog posts (1-2 per week)")]
      }),
 
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Brief analysis connecting news to module frameworks")]
      }),
 
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Discussion prompts for forums")]
      }),
 
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Optional suggested activities")]
      }),
 
      new Paragraph({ text: "", spacing: { after: 120 } }),
 
      new Paragraph({
        children: [
          new TextRun({
            text: "Teaching approach:",
            bold: true
          }),
          new TextRun({
            text: " Module team curates a 'This Week in AI' post every Monday. Posted to VLE forum with lightweight facilitation. Students not required to follow all items but encouraged to engage with 2-3 per month."
          })
        ],
        spacing: { after: 120 }
      }),
 
      new Paragraph({
        children: [
          new TextRun({
            text: "Staff efficiency note:",
            bold: true
          }),
          new TextRun({
            text: " This takes ~2 hours per week rotating among module team. Template format makes it quick: 'Here's what happened → Here's the relevant framework from Week X → Questions for discussion.'"
          })
        ],
        spacing: { after: 360 }
      }),
 
      // Flexible Teaching Methods
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun("Flexible Teaching Methods for Rapid Evolution")]
      }),
 
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("1. Case Study Rotation Method")]
      }),
 
      new Paragraph({
        children: [new TextRun("How it works:")],
        spacing: { after: 80 }
      }),
 
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Maintain a library of 30-40 case studies across all module topics")]
      }),
 
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Each presentation requires 8-12 case studies")]
      }),
 
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Students select from menu of options (3-4 choices per topic)")]
      }),
 
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Retire outdated cases, add new ones between presentations")]
      }),
 
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Keep retired cases in archive for comparison assignments")]
      }),
 
      new Paragraph({ text: "", spacing: { after: 120 } }),
 
      new Paragraph({
        children: [
          new TextRun({
            text: "Benefits:",
            bold: true
          }),
          new TextRun({
            text: " Students always work with current examples but are not disadvantaged by start date. Assessment can compare old vs new cases to demonstrate change over time."
          })
        ],
        spacing: { after: 180 }
      }),
 
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("2. Student-Curated Examples")]
      }),
 
      new Paragraph({
        children: [new TextRun("How it works:")],
        spacing: { after: 80 }
      }),
 
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Each student finds 1-2 recent AI controversies or developments during the module")]
      }),
 
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Apply module frameworks to analyze their chosen example")]
      }),
 
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Share analysis in forum or structured peer review")]
      }),
 
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Best student analyses added to case study bank with attribution")]
      }),
 
      new Paragraph({ text: "", spacing: { after: 120 } }),
 
      new Paragraph({
        children: [
          new TextRun({
            text: "Benefits:",
            bold: true
          }),
          new TextRun({
            text: " Distributes update burden, develops student research skills, ensures examples are current, builds student ownership. Module team reviews and polishes best contributions."
          })
        ],
        spacing: { after: 180 }
      }),
 
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("3. Framework-First Teaching")]
      }),
 
      new Paragraph({
        children: [new TextRun("Teaching sequence:")],
        spacing: { after: 80 }
      }),
 
      new Paragraph({
        numbering: { reference: "numbering", level: 0 },
        children: [new TextRun("Introduce analytical framework (e.g., sociotechnical analysis, feminist standpoint theory)")]
      }),
 
      new Paragraph({
        numbering: { reference: "numbering", level: 0 },
        children: [new TextRun("Demonstrate application with historical example (stable)")]
      }),
 
      new Paragraph({
        numbering: { reference: "numbering", level: 0 },
        children: [new TextRun("Students practice with curated current example")]
      }),
 
      new Paragraph({
        numbering: { reference: "numbering", level: 0 },
        children: [new TextRun("Students apply to self-selected recent development")]
      }),
 
      new Paragraph({ text: "", spacing: { after: 120 } }),
 
      new Paragraph({
        children: [
          new TextRun({
            text: "Benefits:",
            bold: true
          }),
          new TextRun({
            text: " Framework is portable across examples. Specific AI systems can change but analytical approach remains constant."
          })
        ],
        spacing: { after: 180 }
      }),
 
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("4. Comparative Historical Analysis")]
      }),
 
      new Paragraph({
        children: [new TextRun("How it works:")],
        spacing: { after: 80 }
      }),
 
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Pair historical cases with contemporary equivalents")]
      }),
 
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Example: IQ testing (1920s) → AI hiring algorithms (2020s)")]
      }),
 
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Example: Census categorization (historical) → Facial recognition (current)")]
      }),
 
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Students analyze continuities and changes")]
      }),
 
      new Paragraph({ text: "", spacing: { after: 120 } }),
 
      new Paragraph({
        children: [
          new TextRun({
            text: "Benefits:",
            bold: true
          }),
          new TextRun({
            text: " Historical examples are stable; contemporary examples can update while pattern remains. Demonstrates AI issues aren't new but have deeper roots."
          })
        ],
        spacing: { after: 360 }
      }),
 
      // Assessment Design
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun("Assessment Design for Rapid Change")]
      }),
 
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("Principle: Assess Transferable Skills, Not Current Knowledge")]
      }),
 
      new Paragraph({
        children: [
          new TextRun({
            text: "Instead of asking: ",
            italics: true
          }),
          new TextRun({
            text: "'What are the problems with facial recognition?'",
            italics: true
          })
        ],
        spacing: { after: 80 }
      }),
 
      new Paragraph({
        children: [
          new TextRun({
            text: "Ask: ",
            italics: true
          }),
          new TextRun({
            text: "'Apply sociotechnical analysis to examine how [AI system of your choice] embodies and perpetuates power relations.'",
            italics: true
          })
        ],
        spacing: { after: 240 }
      }),
 
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("Flexible Assessment Structures")]
      }),
 
      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun("Assessment 1: Ethical Analysis Essay (30%)")]
      }),
 
      new Paragraph({
        children: [
          new TextRun({
            text: "Student choice structure:",
            bold: true
          })
        ],
        spacing: { after: 80 }
      }),
 
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Choose ONE AI system deployed in the last 3 years")]
      }),
 
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Apply at least THREE ethical frameworks from the module")]
      }),
 
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Must include at least ONE non-Western or critical framework")]
      }),
 
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Provide concrete recommendations for intervention")]
      }),
 
      new Paragraph({ text: "", spacing: { after: 120 } }),
 
      new Paragraph({
        children: [
          new TextRun({
            text: "Why this works:",
            bold: true
          }),
          new TextRun({
            text: " Students choose their own contemporary example. Rubric assesses quality of framework application, not which system they chose. Can accommodate any AI system that exists during their study."
          })
        ],
        spacing: { after: 180 }
      }),
 
      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun("Assessment 2: Impact Analysis Report (35%)")]
      }),
 
      new Paragraph({
        children: [
          new TextRun({
            text: "Required elements:",
            bold: true
          })
        ],
        spacing: { after: 80 }
      }),
 
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Social, economic, political, environmental analysis")]
      }),
 
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Examination of power inequities")]
      }),
 
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Differential impacts across populations")]
      }),
 
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Discussion of resistance movements or collective responses")]
      }),
 
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Justice-oriented recommendations")]
      }),
 
      new Paragraph({ text: "", spacing: { after: 120 } }),
 
      new Paragraph({
        children: [
          new TextRun({
            text: "Flexible options:",
            bold: true
          })
        ],
        spacing: { after: 80 }
      }),
 
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Option A: Deep analysis of ONE recently deployed system")]
      }),
 
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Option B: Comparative analysis of TWO systems in same domain")]
      }),
 
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Option C: Historical comparison (how issue has evolved from past to present)")]
      }),
 
      new Paragraph({ text: "", spacing: { after: 180 } }),
 
      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun("Assessment 3: Governance Proposal (35%)")]
      }),
 
      new Paragraph({
        children: [
          new TextRun({
            text: "Structure:",
            bold: true
          })
        ],
        spacing: { after: 80 }
      }),
 
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Choose an AI application domain (healthcare, criminal justice, employment, etc.)")]
      }),
 
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Propose governance framework addressing multiple scales:")]
      }),
 
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("  - Organizational practices")]
      }),
 
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("  - Regulatory requirements")]
      }),
 
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("  - Individual rights and agency")]
      }),
 
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("  - Collective action strategies")]
      }),
 
      new Paragraph({ text: "", spacing: { after: 120 } }),
 
      new Paragraph({
        children: [
          new TextRun({
            text: "Why this works:",
            bold: true
          }),
          new TextRun({
            text: " Domain stays constant but specific AI systems within it change. Students reference current regulatory landscape (which tutors verify) but are assessed on quality of governance design, not encyclopedic policy knowledge."
          })
        ],
        spacing: { after: 360 }
      }),
 
      // Update Workflow
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun("Practical Update Workflow")]
      }),
 
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("Annual Review Cycle")]
      }),
 
      new Paragraph({
        children: [
          new TextRun({
            text: "June (Post-Teaching):",
            bold: true
          })
        ],
        spacing: { after: 80 }
      }),
 
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Module team reviews: What became outdated? What controversies dominated student discussion?")]
      }),
 
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Identify 5-10 case studies needing retirement or major revision")]
      }),
 
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Flag any framework explanations needing adjustment")]
      }),
 
      new Paragraph({ text: "", spacing: { after: 120 } }),
 
      new Paragraph({
        children: [
          new TextRun({
            text: "July-August (Summer Update):",
            bold: true
          })
        ],
        spacing: { after: 80 }
      }),
 
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Write/commission 5-10 new case studies")]
      }),
 
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Update statistics, policy references, and current events sections")]
      }),
 
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Review best student contributions from previous year for case bank inclusion")]
      }),
 
      new Paragraph({ text: "", spacing: { after: 120 } }),
 
      new Paragraph({
        children: [
          new TextRun({
            text: "September (Pre-Teaching):",
            bold: true
          })
        ],
        spacing: { after: 80 }
      }),
 
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Brief tutor training on new cases and updated materials")]
      }),
 
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Update VLE with new materials")]
      }),
 
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Publish 'What's New This Year' guide for returning students and tutors")]
      }),
 
      new Paragraph({ text: "", spacing: { after: 120 } }),
 
      new Paragraph({
        children: [
          new TextRun({
            text: "January (Mid-Year Check):",
            bold: true
          })
        ],
        spacing: { after: 80 }
      }),
 
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Light refresh: add 2-3 new case studies if major developments occurred")]
      }),
 
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Update current events stream")]
      }),
 
      new Paragraph({ text: "", spacing: { after: 240 } }),
 
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("Task Allocation for Efficiency")]
      }),
 
      new Table({
        width: { size: 9360, type: WidthType.DXA },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                borders,
                shading: { fill: "E6F2FF", type: ShadingType.CLEAR },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({ children: [new TextRun({ text: "Task", bold: true })] })]
              }),
              new TableCell({
                borders,
                shading: { fill: "E6F2FF", type: ShadingType.CLEAR },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({ children: [new TextRun({ text: "Frequency", bold: true })] })]
              }),
              new TableCell({
                borders,
                shading: { fill: "E6F2FF", type: ShadingType.CLEAR },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({ children: [new TextRun({ text: "Time", bold: true })] })]
              }),
              new TableCell({
                borders,
                shading: { fill: "E6F2FF", type: ShadingType.CLEAR },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({ children: [new TextRun({ text: "Who", bold: true })] })]
              })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({
                borders,
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({ children: [new TextRun("Weekly current events post")] })]
              }),
              new TableCell({
                borders,
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({ children: [new TextRun("Weekly during teaching")] })]
              }),
              new TableCell({
                borders,
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({ children: [new TextRun("2 hours/week")] })]
              }),
              new TableCell({
                borders,
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({ children: [new TextRun("Rotating team member")] })]
              })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({
                borders,
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({ children: [new TextRun("New case study development")] })]
              }),
              new TableCell({
                borders,
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({ children: [new TextRun("5-10 per year")] })]
              }),
              new TableCell({
                borders,
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({ children: [new TextRun("8-10 hours each")] })]
              }),
              new TableCell({
                borders,
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({ children: [new TextRun("Split among team")] })]
              })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({
                borders,
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({ children: [new TextRun("Case study update/revision")] })]
              }),
              new TableCell({
                borders,
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({ children: [new TextRun("5-10 per year")] })]
              }),
              new TableCell({
                borders,
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({ children: [new TextRun("2-4 hours each")] })]
              }),
              new TableCell({
                borders,
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({ children: [new TextRun("Split among team")] })]
              })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({
                borders,
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({ children: [new TextRun("Student contribution review")] })]
              }),
              new TableCell({
                borders,
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({ children: [new TextRun("End of each presentation")] })]
              }),
              new TableCell({
                borders,
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({ children: [new TextRun("10 hours")] })]
              }),
              new TableCell({
                borders,
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({ children: [new TextRun("Module chair")] })]
              })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({
                borders,
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({ children: [new TextRun("Annual review and planning")] })]
              }),
              new TableCell({
                borders,
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({ children: [new TextRun("Annually")] })]
              }),
              new TableCell({
                borders,
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({ children: [new TextRun("1 day meeting")] })]
              }),
              new TableCell({
                borders,
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({ children: [new TextRun("Full module team")] })]
              })
            ]
          })
        ]
      }),
 
      new Paragraph({ text: "", spacing: { after: 360 } }),
 
      // Technology Infrastructure
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun("Technology Infrastructure for Rapid Updates")]
      }),
 
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("Digital Learning Environment Setup")]
      }),
 
      new Paragraph({
        children: [
          new TextRun({
            text: "1. Modular VLE Structure",
            bold: true
          })
        ],
        spacing: { after: 80 }
      }),
 
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Core materials: Traditional OU study units (PDF/HTML)")]
      }),
 
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Case study library: Searchable by topic, year, sector, with version tracking")]
      }),
 
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Current events: Blog-style 'This Week in AI' with RSS feed")]
      }),
 
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Discussion forums: Topic-specific and general discussion")]
      }),
 
      new Paragraph({ text: "", spacing: { after: 120 } }),
 
      new Paragraph({
        children: [
          new TextRun({
            text: "2. Case Study Database Features",
            bold: true
          })
        ],
        spacing: { after: 80 }
      }),
 
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Tagging system: Topic, sector, framework application, date, geographic region")]
      }),
 
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Version history: Students can see how understanding of a case evolved")]
      }),
 
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("'Related cases' suggestions based on tags")]
      }),
 
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Student rating system: helps identify most useful cases")]
      }),
 
      new Paragraph({ text: "", spacing: { after: 120 } }),
 
      new Paragraph({
        children: [
          new TextRun({
            text: "3. Update Notification System",
            bold: true
          })
        ],
        spacing: { after: 80 }
      }),
 
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Automated alerts when new cases added")]
      }),
 
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("'What's changed' digest at start of each month")]
      }),
 
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Optional: Students can subscribe to topic-specific updates")]
      }),
 
      new Paragraph({ text: "", spacing: { after: 360 } }),
 
      // Tutor Support
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun("Supporting Tutors in Rapidly Changing Field")]
      }),
 
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("Challenges")]
      }),
 
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Tutors cannot be expected to track all AI developments")]
      }),
 
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Students may reference very recent controversies tutors haven't encountered")]
      }),
 
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Need consistent marking despite diverse examples")]
      }),
 
      new Paragraph({ text: "", spacing: { after: 180 } }),
 
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("Solutions")]
      }),
 
      new Paragraph({
        children: [
          new TextRun({
            text: "1. Framework-Focused Rubrics",
            bold: true
          })
        ],
        spacing: { after: 80 }
      }),
 
      new Paragraph({
        children: [new TextRun("Mark based on quality of framework application, not knowledge of specific case. Rubric questions:")]
      }),
 
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Does student correctly apply sociotechnical analysis?")]
      }),
 
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Do they identify relevant power relations?")]
      }),
 
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Is ethical reasoning rigorous and well-justified?")]
      }),
 
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Are recommendations concrete and feasible?")]
      }),
 
      new Paragraph({ text: "", spacing: { after: 120 } }),
 
      new Paragraph({
        children: [
          new TextRun({
            text: "2. Tutor Resource Hub",
            bold: true
          })
        ],
        spacing: { after: 80 }
      }),
 
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Monthly tutor briefing: 'These controversies are likely to come up this month'")]
      }),
 
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Quick reference guides: 2-page summaries of major cases")]
      }),
 
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Tutor forum for peer support: 'Has anyone encountered X in student work?'")]
      }),
 
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Module team on-call: Designated team member answers tutor queries about unfamiliar cases")]
      }),
 
      new Paragraph({ text: "", spacing: { after: 120 } }),
 
      new Paragraph({
        children: [
          new TextRun({
            text: "3. Tutor Development",
            bold: true
          })
        ],
        spacing: { after: 80 }
      }),
 
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Annual training focuses on: new frameworks, updated case studies, marking calibration")]
      }),
 
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Mid-year optional webinar: 'What's happening in AI this year'")]
      }),
 
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Shared marking examples with different student-chosen cases")]
      }),
 
      new Paragraph({ text: "", spacing: { after: 360 } }),
 
      // Example Weekly Schedule
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun("Example Weekly Study Structure")]
      }),
 
      new Paragraph({
        children: [
          new TextRun({
            text: "Block 2, Week 3: AI and Democracy",
            bold: true,
            italics: true
          })
        ],
        spacing: { after: 180 }
      }),
 
      new Paragraph({
        children: [
          new TextRun({
            text: "Monday (3 hours):",
            bold: true
          })
        ],
        spacing: { after: 80 }
      }),
 
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Read: Module guide section on 'AI and Democracy' (stable framework material) - 1 hour")]
      }),
 
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Read: Zuboff chapter on microtargeting (core reading) - 1.5 hours")]
      }),
 
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Review: 'This Week in AI' post - 30 min")]
      }),
 
      new Paragraph({ text: "", spacing: { after: 120 } }),
 
      new Paragraph({
        children: [
          new TextRun({
            text: "Wednesday (4 hours):",
            bold: true
          })
        ],
        spacing: { after: 80 }
      }),
 
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Case study deep dive: Choose 2 from 4 options - 2 hours")]
      }),
 
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("  Option A: 'Cambridge Analytica and the 2016 Election' (updated 2024)")]
      }),
 
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("  Option B: 'Deepfakes and Electoral Misinformation' (updated 2025)")]
      }),
 
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("  Option C: 'Platform Moderation During Elections' (updated 2024)")]
      }),
 
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("  Option D: 'AI-Generated Political Advertising' (updated 2025)")]
      }),
 
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Forum discussion: Compare your chosen cases with peers - 1 hour")]
      }),
 
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Activity: Apply democratic theory framework to analyze one case - 1 hour")]
      }),
 
      new Paragraph({ text: "", spacing: { after: 120 } }),
 
      new Paragraph({
        children: [
          new TextRun({
            text: "Friday (3 hours):",
            bold: true
          })
        ],
        spacing: { after: 80 }
      }),
 
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Optional: Find and analyze your own recent AI/democracy case - 2 hours")]
      }),
 
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Reflection: How do power relations shape AI's impact on democracy? - 1 hour")]
      }),
 
      new Paragraph({ text: "", spacing: { after: 360 } }),
 
      // Risk Mitigation
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun("Risk Mitigation Strategies")]
      }),
 
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("Potential Risks and Solutions")]
      }),
 
      new Paragraph({
        children: [
          new TextRun({
            text: "Risk 1: Update burden becomes unsustainable",
            bold: true
          })
        ],
        spacing: { after: 80 }
      }),
 
      new Paragraph({
        children: [
          new TextRun({
            text: "Mitigation:",
            italics: true
          })
        ],
        spacing: { after: 60 }
      }),
 
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Build update time into workload models from the start")]
      }),
 
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Distribute work across team using rotation system")]
      }),
 
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Leverage student contributions to reduce burden")]
      }),
 
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Accept that not everything needs updating every year - prioritize highest-impact changes")]
      }),
 
      new Paragraph({ text: "", spacing: { after: 120 } }),
 
      new Paragraph({
        children: [
          new TextRun({
            text: "Risk 2: Students at different points in module have different experiences",
            bold: true
          })
        ],
        spacing: { after: 80 }
      }),
 
      new Paragraph({
        children: [
          new TextRun({
            text: "Mitigation:",
            italics: true
          })
        ],
        spacing: { after: 60 }
      }),
 
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("This is a feature, not a bug - AI is changing rapidly and students should see that")]
      }),
 
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Assessment allows student choice of examples, so no disadvantage from timing")]
      }),
 
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Historical cases remain available so earlier students aren't disadvantaged")]
      }),
 
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Can explicitly make 'compare earlier and later cases' an assessment option")]
      }),
 
      new Paragraph({ text: "", spacing: { after: 120 } }),
 
      new Paragraph({
        children: [
          new TextRun({
            text: "Risk 3: Tutors feel overwhelmed by rapid changes",
            bold: true
          })
        ],
        spacing: { after: 80 }
      }),
 
      new Paragraph({
        children: [
          new TextRun({
            text: "Mitigation:",
            italics: true
          })
        ],
        spacing: { after: 60 }
      }),
 
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Framework-focused marking means tutors don't need to know every case")]
      }),
 
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Strong tutor support infrastructure with quick-reference materials")]
      }),
 
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Module team provides expert backup for unfamiliar cases")]
      }),
 
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Set expectation that this module requires ongoing learning (frame as professional development)")]
      }),
 
      new Paragraph({ text: "", spacing: { after: 120 } }),
 
      new Paragraph({
        children: [
          new TextRun({
            text: "Risk 4: Quality suffers from rapid production",
            bold: true
          })
        ],
        spacing: { after: 80 }
      }),
 
      new Paragraph({
        children: [
          new TextRun({
            text: "Mitigation:",
            italics: true
          })
        ],
        spacing: { after: 60 }
      }),
 
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Use standardized case study template to maintain consistency")]
      }),
 
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Peer review process within module team")]
      }),
 
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Accept that 'good enough now' is better than 'perfect in two years'")]
      }),
 
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Version control allows iterative improvement based on student and tutor feedback")]
      }),
 
      new Paragraph({ text: "", spacing: { after: 360 } }),
 
      // Success Metrics
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun("Measuring Success")]
      }),
 
      new Paragraph({
        children: [
          new TextRun({
            text: "How will we know this approach is working?",
            bold: true
          })
        ],
        spacing: { after: 120 }
      }),
 
      new Paragraph({
        children: [
          new TextRun({
            text: "Quantitative Metrics:",
            bold: true
          })
        ],
        spacing: { after: 80 }
      }),
 
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("% of student assignments referencing cases less than 2 years old")]
      }),
 
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Diversity of cases chosen by students (are they using the full library?)")]
      }),
 
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Tutor confidence ratings about handling unfamiliar cases")]
      }),
 
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Time spent on updates vs. planned allocation")]
      }),
 
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Student engagement with 'This Week in AI' (views, comments)")]
      }),
 
      new Paragraph({ text: "", spacing: { after: 120 } }),
 
      new Paragraph({
        children: [
          new TextRun({
            text: "Qualitative Metrics:",
            bold: true
          })
        ],
        spacing: { after: 80 }
      }),
 
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Student feedback: Do they feel the module is relevant and current?")]
      }),
 
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Tutor feedback: Is the support adequate? What additional resources needed?")]
      }),
 
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Assessment quality: Are students applying frameworks well to current cases?")]
      }),
 
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("External examiner comments on currency and relevance")]
      }),
 
      new Paragraph({ text: "", spacing: { after: 360 } }),
 
      // Conclusion
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun("Conclusion: Teaching AI in Society as Living Curriculum")]
      }),
 
      new Paragraph({
        children: [
          new TextRun({
            text: "The rapid pace of AI development demands a new approach to curriculum design. This teaching strategy embraces change rather than fighting it. By separating stable conceptual frameworks from volatile examples, creating modular and updateable content, distributing update work across the team, leveraging student contributions, and assessing transferable analytical skills rather than current knowledge, we can maintain a consistently relevant and rigorous module."
          })
        ],
        spacing: { after: 180 }
      }),
 
      new Paragraph({
        children: [
          new TextRun({
            text: "This approach requires upfront investment in infrastructure and a shift in mindset: the module is never 'finished,' but continuously evolving. However, this mirrors the reality of AI in society itself and better prepares students for careers in a rapidly changing field."
          })
        ],
        spacing: { after: 180 }
      }),
 
      new Paragraph({
        children: [
          new TextRun({
            text: "Key principles:",
            bold: true
          })
        ],
        spacing: { after: 80 }
      }),
 
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Build for change from the start")]
      }),
 
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Teach frameworks, not facts")]
      }),
 
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Distribute the burden")]
      }),
 
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Embrace 'good enough now' over 'perfect later'")]
      }),
 
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Make updating visible and part of the learning")]
      }),
 
      new Paragraph({ text: "", spacing: { after: 180 } }),
 
      new Paragraph({
        children: [
          new TextRun({
            text: "The result: a module that remains perpetually current, relevant, and intellectually rigorous, preparing students to be critical, adaptive thinkers who can navigate whatever AI developments emerge in their careers."
          })
        ]
      })
    ]
  }]
});
 
Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync("./TM342_Teaching_Strategy.docx", buffer);
  console.log("Teaching strategy document created successfully!");
});