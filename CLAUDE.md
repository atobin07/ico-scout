# Indeed Sweeper

## Routine: Job Search & Application Materials

Search Indeed for jobs matching the user's criteria and prepare application materials.

### Steps

1. Search Indeed using the provided job criteria (role, location, keywords, experience level, etc.).
2. For each matching job found, retrieve the full job description and URL.
3. Select the best-fit resume from `resumes/` based on the job type (see Resume Selection Guide below).
4. Draft a tailored resume highlighting relevant experience from the selected base resume that matches the role.
5. Draft a tailored cover letter (3–4 paragraphs) addressing the job requirements and company.
6. Assess fit strength: **STRONG** (resume maps closely to the role) or **WEAK** (partial match, worth applying but lower confidence). Create a folder named `[Company Name] - [Job Title] - [Date]` inside `applications/STRONG/` or `applications/WEAK/` accordingly, and save:
   - `job_description.md` — full job description and Indeed URL
   - `resume.md` — tailored resume
   - `cover_letter.md` — tailored cover letter
7. Provide a summary of jobs found, folders created, and next steps for the user to review and apply.

### Prerequisites

Before running this routine, confirm the user has provided:

- **Job search criteria** — desired roles, locations, keywords, experience level, salary range, etc.
- **Resume / experience details** — work history, skills, education, and any other background relevant to the roles being targeted.

If either is missing, ask for it before proceeding.

---

## Resume Selection Guide

Choose the base resume from `resumes/` that best matches the job being applied to:

| Job Type | Resume File |
|----------|-------------|
| Airtable, data analyst, project manager, workflow automation, BI, Smartsheet admin | `resumes/resume_airtable_data_analyst.md` |
| EDI integrations, SQL/database, supply chain tech, systems integration | `resumes/resume_edi_data_analyst.md` |
| Logistics, supply chain, warehouse management, freight, operations | `resumes/resume_logistics_supply_chain.md` |
| Senior data roles, cloud engineering, AI/ML, DevOps, data engineering | `resumes/resume_senior_data_analytics_cloud.md` |
| Data entry, administrative analyst, spreadsheet-heavy, Smartsheet operator | `resumes/resume_data_entry_specialist.md` |

When in doubt, default to `resumes/resume_airtable_data_analyst.md` — it is the most comprehensive and recent version.

---

## Files

- `criteria/` — user-provided job search criteria (role, location, keywords, salary, etc.)
  - `criteria/job_search_criteria.md` — current active search criteria
- `resumes/` — base resumes by role type (see Resume Selection Guide above)
- `applications/STRONG/` — strong fit jobs; subfolders named `[Company Name] - [Job Title] - [Date]`
- `applications/WEAK/` — weak fit jobs; same subfolder naming convention
  - Each subfolder contains:
    - `job_description.md` — full job description and Indeed URL
    - `resume.md` — tailored resume
    - `cover_letter.md` — tailored cover letter

## Candidate Info
- **Name:** Alexander Tobin
- **Phone:** (757) 289-1204
- **Email:** atobin@alum.utk.edu | atobin07@proton.me
- **Location:** Virginia Beach, VA
