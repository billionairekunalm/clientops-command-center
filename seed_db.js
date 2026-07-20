/* eslint-disable */
const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

// Simple custom .env loader
const envPath = path.join(__dirname, ".env");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf8");
  envContent.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const firstEq = trimmed.indexOf("=");
    if (firstEq !== -1) {
      const key = trimmed.substring(0, firstEq).trim();
      const val = trimmed.substring(firstEq + 1).trim();
      process.env[key] = val;
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be defined in your .env file.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const initialClients = [
  {
    id: 1,
    name: "Aman Verma",
    company: "Verma & Co.",
    initials: "AV",
    tone: "violet",
    stage: "Proposal",
    health: "red",
    priority: 92,
    next_action: "Send revised proposal",
    due: "2 days overdue",
    note: "Client asked for a revised scope with broken-down itemized costs.",
    timeline: [
      { id: 1, title: "Scope revision requested", desc: "Aman requested breakdown of licensing costs.", date: "Jul 19" },
      { id: 2, title: "Proposal presentation", desc: "Presented initial draft proposal via Zoom.", date: "Jul 15" },
      { id: 3, title: "Client profile created", desc: "Onboarded client into ClientOps.", date: "Jul 12" },
    ],
  },
  {
    id: 2,
    name: "Neha Singh",
    company: "Serein Studio",
    initials: "NS",
    tone: "orange",
    stage: "Closing",
    health: "red",
    priority: 88,
    next_action: "Follow up on agreement",
    due: "Today",
    note: "Decision-maker is back from travel. Standard service contract sent for signature.",
    timeline: [
      { id: 4, title: "Agreement drafted & sent", desc: "Sent master service agreement via Docusign.", date: "Jul 18" },
      { id: 5, title: "Scope finalized", desc: "Agreed on 6-month support scope.", date: "Jul 14" },
    ],
  },
  {
    id: 3,
    name: "Priya Sharma",
    company: "Northstar Media",
    initials: "PS",
    tone: "blue",
    stage: "Active work",
    health: "amber",
    priority: 74,
    next_action: "Finalize podcast questions",
    due: "Tomorrow",
    note: "Podcast planning call at 11:00 AM. Guest outline is prepared.",
    timeline: [
      { id: 6, title: "Guest list approved", desc: "Priya signed off on the speaker spreadsheet.", date: "Jul 16" },
      { id: 7, title: "Brand deck updated", desc: "Sent revised marketing slide template.", date: "Jul 11" },
    ],
  },
  {
    id: 4,
    name: "Rahul Mehta",
    company: "Elevate Labs",
    initials: "RM",
    tone: "teal",
    stage: "Delivery",
    health: "amber",
    priority: 69,
    next_action: "Send delivery review link",
    due: "In 2 days",
    note: "Final cut is awaiting internal review. Render looks clean.",
    timeline: [
      { id: 8, title: "First cut review", desc: "Received feedback on pacing and audio mixing.", date: "Jul 17" },
      { id: 9, title: "Asset handoff complete", desc: "Raw video clips uploaded to shared storage.", date: "Jul 10" },
    ],
  },
  {
    id: 5,
    name: "Ananya Kapoor",
    company: "Bloom Ventures",
    initials: "AK",
    tone: "rose",
    stage: "Closing",
    health: "green",
    priority: 63,
    next_action: "Prepare closing call",
    due: "In 3 days",
    note: "Proposal viewed twice this week. Reviewing partnership model.",
    timeline: [
      { id: 10, title: "Proposal viewed", desc: "Proposal was opened by decision makers.", date: "Jul 19" },
      { id: 11, title: "Pitch deck delivered", desc: "Sent custom portfolio slides.", date: "Jul 08" },
    ],
  },
];

const initialTasks = [
  { id: 1, title: "Send revised proposal", client_id: 1, due: "Overdue", done: false, priority: "high" },
  { id: 2, title: "Finalize podcast questions", client_id: 3, due: "Tomorrow", done: false, priority: "medium" },
  { id: 3, title: "Review delivery checklist", client_id: 4, due: "Friday", done: false, priority: "low" },
  { id: 4, title: "Share project brief", client_id: 2, due: "Today", done: true, priority: "high" },
  { id: 5, title: "Schedule closing final call", client_id: 5, due: "This week", done: false, priority: "medium" },
];

async function seed() {
  console.log("Seeding Supabase database...");

  // 1. Seed clients
  console.log("Seeding 'clients' table...");
  const { error: clientError } = await supabase.from("clients").upsert(initialClients);
  if (clientError) {
    if (clientError.code === "P0001" || clientError.message.includes("does not exist")) {
      printSQLInstructions();
      process.exit(1);
    }
    console.error("Failed to seed clients:", clientError);
    process.exit(1);
  }
  console.log("Successfully seeded clients!");

  // 2. Seed tasks
  console.log("Seeding 'tasks' table...");
  const { error: taskError } = await supabase.from("tasks").upsert(initialTasks);
  if (taskError) {
    console.error("Failed to seed tasks:", taskError);
    process.exit(1);
  }
  console.log("Successfully seeded tasks!");
  console.log("Database seed completed successfully!");
}

function printSQLInstructions() {
  console.log(`
======================================================================
⚠️ SQL TABLES NOT FOUND!
----------------------------------------------------------------------
Your Supabase project does not have the 'clients' and 'tasks' tables 
configured yet. 

Please copy the following SQL query and paste it in the SQL Editor
of your Supabase dashboard (https://supabase.com):

------------------ COPY START ------------------
-- Create clients table
CREATE TABLE IF NOT EXISTS clients (
  id bigint PRIMARY KEY,
  name text NOT NULL,
  company text,
  initials text,
  tone text,
  stage text,
  health text,
  priority bigint,
  next_action text,
  due text,
  note text,
  timeline jsonb DEFAULT '[]'::jsonb,
  logo text,
  event_type text,
  deal_amount numeric DEFAULT 0,
  payment_steps integer DEFAULT 1,
  paid_steps integer DEFAULT 0
);

-- Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id bigint PRIMARY KEY,
  title text NOT NULL,
  client_id bigint REFERENCES clients(id) ON DELETE CASCADE,
  due text,
  done boolean DEFAULT false,
  priority text
);

-- Enable Row Level Security (RLS)
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (since the app uses anon key)
DROP POLICY IF EXISTS "Allow public read" ON clients;
CREATE POLICY "Allow public read" ON clients FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert" ON clients;
CREATE POLICY "Allow public insert" ON clients FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update" ON clients;
CREATE POLICY "Allow public update" ON clients FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow public delete" ON clients;
CREATE POLICY "Allow public delete" ON clients FOR DELETE USING (true);

DROP POLICY IF EXISTS "Allow public read" ON tasks;
CREATE POLICY "Allow public read" ON tasks FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert" ON tasks;
CREATE POLICY "Allow public insert" ON tasks FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update" ON tasks;
CREATE POLICY "Allow public update" ON tasks FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow public delete" ON tasks;
CREATE POLICY "Allow public delete" ON tasks FOR DELETE USING (true);
------------------ COPY END --------------------

After running this SQL script, execute the seeding tool again:
node seed_db.js
======================================================================
`);
}

seed();
