# Indeed Sweeper

## Routine: Job Search & Application Materials

Search Indeed for jobs matching the user's criteria and prepare application materials.

### Steps

1. Search Indeed using the provided job criteria (role, location, keywords, experience level, etc.).
2. For each matching job found, retrieve the full job description and URL.
3. Draft a tailored resume highlighting relevant experience from the user's background that matches the role.
4. Draft a tailored cover letter (3–4 paragraphs) addressing the job requirements and company.
5. Create a folder named `[Company Name] - [Job Title] - [Date]` and save:
   - A document with the complete job description and the Indeed URL
   - The tailored resume
   - The tailored cover letter
6. Provide a summary of jobs found, folders created, and next steps for the user to review and apply.

### Prerequisites

Before running this routine, confirm the user has provided:

- **Job search criteria** — desired roles, locations, keywords, experience level, salary range, etc.
- **Resume / experience details** — work history, skills, education, and any other background relevant to the roles being targeted.

If either is missing, ask for it before proceeding.

### Files

- `criteria/` — user-provided job search criteria (role, location, keywords, salary, etc.)
- `resumes/` — user-provided base resume(s) and experience details
- `applications/` — output folder; each job gets its own subfolder named `[Company Name] - [Job Title] - [Date]`
  - `job_description.md` — full job description and Indeed URL
  - `resume.md` — tailored resume
  - `cover_letter.md` — tailored cover letter
