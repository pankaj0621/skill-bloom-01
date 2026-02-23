
-- Add stream to skill_tracks
ALTER TABLE public.skill_tracks ADD COLUMN stream text;

-- Add category to skills
ALTER TABLE public.skills ADD COLUMN category text;

-- Update existing tracks as btech stream
UPDATE public.skill_tracks SET stream = 'btech';

-- Add categories to existing DSA skills
UPDATE public.skills SET category = 'Fundamentals' WHERE track_id = 'a1b2c3d4-0001-4000-8000-000000000001' AND name IN ('Arrays', 'Linked Lists', 'Stacks & Queues', 'Hashing');
UPDATE public.skills SET category = 'Advanced Structures' WHERE track_id = 'a1b2c3d4-0001-4000-8000-000000000001' AND name IN ('Trees', 'Graphs');
UPDATE public.skills SET category = 'Algorithms' WHERE track_id = 'a1b2c3d4-0001-4000-8000-000000000001' AND name IN ('Sorting Algorithms', 'Dynamic Programming', 'Recursion', 'Greedy Algorithms');

-- Add categories to existing Web Dev skills
UPDATE public.skills SET category = 'Frontend' WHERE track_id = 'a1b2c3d4-0002-4000-8000-000000000002' AND name IN ('HTML/CSS Basics', 'JavaScript Fundamentals', 'React Basics', 'State Management');
UPDATE public.skills SET category = 'Backend' WHERE track_id = 'a1b2c3d4-0002-4000-8000-000000000002' AND name IN ('REST APIs', 'Node.js/Express', 'Databases (SQL)', 'Authentication');
UPDATE public.skills SET category = 'DevOps' WHERE track_id = 'a1b2c3d4-0002-4000-8000-000000000002' AND name IN ('Deployment', 'Testing');

-- Add categories to existing System Design skills
UPDATE public.skills SET category = 'Core Concepts' WHERE track_id = 'a1b2c3d4-0003-4000-8000-000000000003' AND name IN ('Scalability Basics', 'Load Balancing', 'Caching', 'CAP Theorem');
UPDATE public.skills SET category = 'Architecture' WHERE track_id = 'a1b2c3d4-0003-4000-8000-000000000003' AND name IN ('Database Design', 'API Design', 'Message Queues', 'Microservices');
UPDATE public.skills SET category = 'Operations' WHERE track_id = 'a1b2c3d4-0003-4000-8000-000000000003' AND name IN ('Monitoring & Logging', 'Security Fundamentals');

-- ===== BA Stream Tracks =====
INSERT INTO public.skill_tracks (id, name, description, is_default, stream) VALUES
  ('b1000001-0001-4000-8000-000000000001', 'Communication & Writing', 'Master professional communication and academic writing skills.', true, 'ba'),
  ('b1000001-0002-4000-8000-000000000002', 'Research & Analysis', 'Learn research methodologies and analytical frameworks.', true, 'ba'),
  ('b1000001-0003-4000-8000-000000000003', 'Digital Literacy', 'Build essential digital and tech skills for the modern workplace.', true, 'ba');

INSERT INTO public.skills (track_id, name, description, "order", difficulty_level, category) VALUES
  ('b1000001-0001-4000-8000-000000000001', 'Academic Writing', 'Structure essays and research papers', 1, 'beginner', 'Writing'),
  ('b1000001-0001-4000-8000-000000000001', 'Business Communication', 'Professional emails and reports', 2, 'beginner', 'Writing'),
  ('b1000001-0001-4000-8000-000000000001', 'Presentation Skills', 'Create and deliver effective presentations', 3, 'intermediate', 'Speaking'),
  ('b1000001-0001-4000-8000-000000000001', 'Critical Thinking', 'Evaluate arguments and evidence', 4, 'intermediate', 'Thinking'),
  ('b1000001-0001-4000-8000-000000000001', 'Persuasive Writing', 'Craft compelling narratives and arguments', 5, 'advanced', 'Writing'),
  ('b1000001-0002-4000-8000-000000000002', 'Research Methodology', 'Qualitative and quantitative methods', 1, 'beginner', 'Methods'),
  ('b1000001-0002-4000-8000-000000000002', 'Data Collection', 'Surveys, interviews, and observation', 2, 'beginner', 'Methods'),
  ('b1000001-0002-4000-8000-000000000002', 'Literature Review', 'Synthesize existing research', 3, 'intermediate', 'Analysis'),
  ('b1000001-0002-4000-8000-000000000002', 'Statistical Analysis Basics', 'Basic stats for social sciences', 4, 'intermediate', 'Analysis'),
  ('b1000001-0002-4000-8000-000000000002', 'Thesis Writing', 'Complete a research thesis', 5, 'advanced', 'Analysis'),
  ('b1000001-0003-4000-8000-000000000003', 'Microsoft Office Suite', 'Word, Excel, PowerPoint proficiency', 1, 'beginner', 'Tools'),
  ('b1000001-0003-4000-8000-000000000003', 'Social Media Management', 'Content strategy and analytics', 2, 'beginner', 'Digital'),
  ('b1000001-0003-4000-8000-000000000003', 'Data Visualization', 'Charts, infographics, dashboards', 3, 'intermediate', 'Digital'),
  ('b1000001-0003-4000-8000-000000000003', 'Basic Web Skills', 'HTML basics and CMS tools', 4, 'intermediate', 'Tools'),
  ('b1000001-0003-4000-8000-000000000003', 'AI Tools for Productivity', 'Leverage AI in workflows', 5, 'advanced', 'Digital');

-- ===== BCom Stream Tracks =====
INSERT INTO public.skill_tracks (id, name, description, is_default, stream) VALUES
  ('c1000001-0001-4000-8000-000000000001', 'Accounting & Finance', 'Master core accounting and financial analysis skills.', true, 'bcom'),
  ('c1000001-0002-4000-8000-000000000002', 'Business Analytics', 'Learn data-driven decision making for business.', true, 'bcom'),
  ('c1000001-0003-4000-8000-000000000003', 'Marketing & Management', 'Understand marketing principles and management frameworks.', true, 'bcom');

INSERT INTO public.skills (track_id, name, description, "order", difficulty_level, category) VALUES
  ('c1000001-0001-4000-8000-000000000001', 'Financial Accounting', 'Journal entries, ledgers, trial balance', 1, 'beginner', 'Accounting'),
  ('c1000001-0001-4000-8000-000000000001', 'Cost Accounting', 'Cost analysis and budgeting', 2, 'beginner', 'Accounting'),
  ('c1000001-0001-4000-8000-000000000001', 'Taxation Basics', 'Income tax and GST fundamentals', 3, 'intermediate', 'Finance'),
  ('c1000001-0001-4000-8000-000000000001', 'Financial Statement Analysis', 'Read and interpret financial reports', 4, 'intermediate', 'Finance'),
  ('c1000001-0001-4000-8000-000000000001', 'Auditing', 'Internal and external audit processes', 5, 'advanced', 'Finance'),
  ('c1000001-0002-4000-8000-000000000002', 'Excel for Business', 'Advanced formulas, pivot tables, macros', 1, 'beginner', 'Tools'),
  ('c1000001-0002-4000-8000-000000000002', 'Business Statistics', 'Descriptive and inferential statistics', 2, 'beginner', 'Analytics'),
  ('c1000001-0002-4000-8000-000000000002', 'Data Analysis with Python', 'Pandas, NumPy for business data', 3, 'intermediate', 'Analytics'),
  ('c1000001-0002-4000-8000-000000000002', 'Business Intelligence Tools', 'Power BI, Tableau basics', 4, 'intermediate', 'Tools'),
  ('c1000001-0002-4000-8000-000000000002', 'Predictive Analytics', 'Forecasting and trend analysis', 5, 'advanced', 'Analytics'),
  ('c1000001-0003-4000-8000-000000000003', 'Marketing Fundamentals', 'Marketing mix and segmentation', 1, 'beginner', 'Marketing'),
  ('c1000001-0003-4000-8000-000000000003', 'Digital Marketing', 'SEO, SEM, social media marketing', 2, 'beginner', 'Marketing'),
  ('c1000001-0003-4000-8000-000000000003', 'Management Principles', 'Planning, organizing, leading, controlling', 3, 'intermediate', 'Management'),
  ('c1000001-0003-4000-8000-000000000003', 'Supply Chain Management', 'Logistics and operations', 4, 'intermediate', 'Management'),
  ('c1000001-0003-4000-8000-000000000003', 'Entrepreneurship', 'Business plan and startup fundamentals', 5, 'advanced', 'Management');

-- ===== BSc Stream Tracks =====
INSERT INTO public.skill_tracks (id, name, description, is_default, stream) VALUES
  ('d1000001-0001-4000-8000-000000000001', 'Scientific Computing', 'Programming and computation skills for science.', true, 'bsc'),
  ('d1000001-0002-4000-8000-000000000002', 'Mathematics & Statistics', 'Core mathematical and statistical foundations.', true, 'bsc'),
  ('d1000001-0003-4000-8000-000000000003', 'Lab & Research Skills', 'Practical laboratory and research techniques.', true, 'bsc');

INSERT INTO public.skills (track_id, name, description, "order", difficulty_level, category) VALUES
  ('d1000001-0001-4000-8000-000000000001', 'Python Programming', 'Core Python for scientific work', 1, 'beginner', 'Programming'),
  ('d1000001-0001-4000-8000-000000000001', 'NumPy & SciPy', 'Numerical computing libraries', 2, 'beginner', 'Programming'),
  ('d1000001-0001-4000-8000-000000000001', 'Data Visualization (Matplotlib)', 'Plotting and charting scientific data', 3, 'intermediate', 'Visualization'),
  ('d1000001-0001-4000-8000-000000000001', 'Machine Learning Basics', 'Scikit-learn and basic ML models', 4, 'intermediate', 'ML'),
  ('d1000001-0001-4000-8000-000000000001', 'Simulation & Modeling', 'Computational simulations', 5, 'advanced', 'ML'),
  ('d1000001-0002-4000-8000-000000000002', 'Calculus', 'Differential and integral calculus', 1, 'beginner', 'Mathematics'),
  ('d1000001-0002-4000-8000-000000000002', 'Linear Algebra', 'Vectors, matrices, transformations', 2, 'beginner', 'Mathematics'),
  ('d1000001-0002-4000-8000-000000000002', 'Probability Theory', 'Probability distributions and theorems', 3, 'intermediate', 'Statistics'),
  ('d1000001-0002-4000-8000-000000000002', 'Statistical Inference', 'Hypothesis testing and confidence intervals', 4, 'intermediate', 'Statistics'),
  ('d1000001-0002-4000-8000-000000000002', 'Numerical Methods', 'Approximation and numerical solutions', 5, 'advanced', 'Mathematics'),
  ('d1000001-0003-4000-8000-000000000003', 'Lab Safety & Protocols', 'Standard laboratory procedures', 1, 'beginner', 'Lab'),
  ('d1000001-0003-4000-8000-000000000003', 'Scientific Writing', 'Lab reports and scientific papers', 2, 'beginner', 'Research'),
  ('d1000001-0003-4000-8000-000000000003', 'Experimental Design', 'Controls, variables, methodology', 3, 'intermediate', 'Research'),
  ('d1000001-0003-4000-8000-000000000003', 'Data Collection & Recording', 'Accurate data measurement techniques', 4, 'intermediate', 'Lab'),
  ('d1000001-0003-4000-8000-000000000003', 'Research Publication', 'Peer review and publishing process', 5, 'advanced', 'Research');

-- ===== "Other" Stream — general skills =====
INSERT INTO public.skill_tracks (id, name, description, is_default, stream) VALUES
  ('e1000001-0001-4000-8000-000000000001', 'Core Professional Skills', 'Essential skills for any career path.', true, 'other'),
  ('e1000001-0002-4000-8000-000000000002', 'Digital & Tech Skills', 'Technology skills for the modern world.', true, 'other');

INSERT INTO public.skills (track_id, name, description, "order", difficulty_level, category) VALUES
  ('e1000001-0001-4000-8000-000000000001', 'Communication Skills', 'Written and verbal communication', 1, 'beginner', 'Soft Skills'),
  ('e1000001-0001-4000-8000-000000000001', 'Time Management', 'Prioritization and productivity', 2, 'beginner', 'Soft Skills'),
  ('e1000001-0001-4000-8000-000000000001', 'Problem Solving', 'Analytical and creative problem solving', 3, 'intermediate', 'Thinking'),
  ('e1000001-0001-4000-8000-000000000001', 'Leadership', 'Team leadership and decision making', 4, 'intermediate', 'Soft Skills'),
  ('e1000001-0001-4000-8000-000000000001', 'Project Management', 'Planning and executing projects', 5, 'advanced', 'Thinking'),
  ('e1000001-0002-4000-8000-000000000002', 'Computer Basics', 'OS, file management, internet skills', 1, 'beginner', 'Basics'),
  ('e1000001-0002-4000-8000-000000000002', 'Spreadsheets', 'Excel/Google Sheets proficiency', 2, 'beginner', 'Basics'),
  ('e1000001-0002-4000-8000-000000000002', 'Online Collaboration', 'Google Workspace, Notion, Slack', 3, 'intermediate', 'Tools'),
  ('e1000001-0002-4000-8000-000000000002', 'Basic Coding', 'Introduction to programming concepts', 4, 'intermediate', 'Tools'),
  ('e1000001-0002-4000-8000-000000000002', 'AI & Automation', 'Using AI tools effectively', 5, 'advanced', 'Tools');
