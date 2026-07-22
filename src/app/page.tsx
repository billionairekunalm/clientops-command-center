/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import {
  BellIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  ChevronRightIcon,
  ClipboardDocumentCheckIcon,
  ClockIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  Squares2X2Icon,
  UserGroupIcon,
  XMarkIcon,
  SunIcon,
  MoonIcon,
  TrashIcon,
  SparklesIcon,
  InformationCircleIcon,
  PencilIcon,
  UserIcon,
  Cog6ToothIcon,
} from "@heroicons/react/24/outline";
import { useMemo, useState, useEffect, useRef, useCallback, Fragment } from "react";
import { supabase } from "../utils/supabase";

type Stage = "Closing" | "Active work" | "Delivery" | "Proposal";

type TimelineItem = {
  id: number;
  title: string;
  desc: string;
  date: string;
};

type Client = {
  id: number;
  name: string;
  company: string;
  initials: string;
  tone: string;
  stage: Stage;
  health: "green" | "amber" | "red";
  priority: number;
  nextAction: string;
  due: string;
  note: string;
  timeline: TimelineItem[];
  logo?: string;
  eventType?: "meeting" | "task";
  dealAmount?: number;
  paymentSteps?: number;
  paidSteps?: number;
};

type Task = {
  id: number;
  title: string;
  clientId?: number; // Linked client ID
  due: string;       // "Overdue", "Today", "Tomorrow", "Friday", "This week", "Later"
  done: boolean;
  priority: "low" | "medium" | "high";
};

type Toast = {
  id: number;
  message: string;
  type: "success" | "warning" | "info" | "error";
};

const initialClients: Client[] = [
  {
    id: 1,
    name: "Aman Verma",
    company: "Verma & Co.",
    initials: "AV",
    tone: "violet",
    stage: "Proposal",
    health: "red",
    priority: 92,
    nextAction: "Send revised proposal",
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
    nextAction: "Follow up on agreement",
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
    nextAction: "Finalize podcast questions",
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
    nextAction: "Send delivery review link",
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
    nextAction: "Prepare closing call",
    due: "In 3 days",
    note: "Proposal viewed twice this week. Reviewing partnership model.",
    timeline: [
      { id: 10, title: "Proposal viewed", desc: "Proposal was opened by decision makers.", date: "Jul 19" },
      { id: 11, title: "Pitch deck delivered", desc: "Sent custom portfolio slides.", date: "Jul 08" },
    ],
  },
];

const initialTasks: Task[] = [
  { id: 1, title: "Send revised proposal", clientId: 1, due: "Overdue", done: false, priority: "high" },
  { id: 2, title: "Finalize podcast questions", clientId: 3, due: "Tomorrow", done: false, priority: "medium" },
  { id: 3, title: "Review delivery checklist", clientId: 4, due: "Friday", done: false, priority: "low" },
  { id: 4, title: "Share project brief", clientId: 2, due: "Today", done: true, priority: "high" },
  { id: 5, title: "Schedule closing final call", clientId: 5, due: "This week", done: false, priority: "medium" },
];

function getNextUniqueId(): number {
  // Generates unique IDs that remain distinct even across page reloads
  return Date.now() * 1000 + Math.floor(Math.random() * 1000);
}

function formatDueLabel(dueStr: string): string {
  if (!dueStr) return "Not scheduled";
  if (!dueStr.includes("-") && !dueStr.includes("T")) {
    return dueStr;
  }
  try {
    const dateObj = new Date(dueStr);
    if (isNaN(dateObj.getTime())) return dueStr;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const targetDate = new Date(dateObj);
    targetDate.setHours(0, 0, 0, 0);

    const diffTime = targetDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const timeStr = dateObj.toLocaleTimeString("default", { hour: "numeric", minute: "2-digit" });

    if (diffDays === 0) return `Today at ${timeStr}`;
    if (diffDays === 1) return `Tomorrow at ${timeStr}`;
    if (diffDays === -1) return `Yesterday at ${timeStr}`;
    if (diffDays > 1 && diffDays <= 7) {
      const weekday = dateObj.toLocaleDateString("default", { weekday: "long" });
      return `${weekday} at ${timeStr}`;
    }

    const dateFormatted = dateObj.toLocaleDateString("default", { month: "short", day: "numeric" });
    return `${dateFormatted} at ${timeStr}`;
  } catch {
    return dueStr;
  }
}

// Global voice AI helpers
async function parseAgendaWithGemini(
  apiKey: string,
  agendaText: string,
  clients: Client[]
): Promise<any> {
  const clientsContext = clients.map((c) => ({ id: c.id, name: c.name, company: c.company }));
  const prompt = `You are a scheduling AI. Analyze the following spoken daily agenda: "${agendaText}".
We have the following registered clients: ${JSON.stringify(clientsContext)}.
Extract all tasks or meetings mentioned in the agenda. Match the "clientName" in each item to one of our registered clients (return the exact client name or matching client ID if found, or empty string if it's a general task).
Return the result strictly conforming to the requested schema.`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  const schema = {
    type: "OBJECT",
    properties: {
      tasks: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            title: { type: "STRING" },
            clientName: { type: "STRING" },
            type: { type: "STRING", enum: ["meeting", "task"] },
            time: { type: "STRING" },
            due: { type: "STRING", enum: ["Today", "Tomorrow", "Friday", "This week", "Later"] }
          },
          required: ["title", "clientName", "type", "due"]
        }
      }
    }
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: schema
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error: ${errorText}`);
  }

  const resData = await response.json();
  const textContent = resData.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!textContent) {
    throw new Error("Empty response from Gemini API");
  }

  return JSON.parse(textContent);
}

const getFormattedDueDate = (category: string, timeStr?: string) => {
  const date = new Date();
  if (category === "Tomorrow") {
    date.setDate(date.getDate() + 1);
  } else if (category === "Friday") {
    const day = date.getDay();
    const daysUntilFriday = (5 - day + 7) % 7 || 7;
    date.setDate(date.getDate() + daysUntilFriday);
  } else if (category === "This week") {
    const day = date.getDay();
    const daysUntilSunday = (7 - day) % 7;
    date.setDate(date.getDate() + daysUntilSunday);
  } else if (category === "Later") {
    date.setDate(date.getDate() + 7);
  }
  
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  
  let timeVal = "10:00";
  if (timeStr) {
    const match = timeStr.match(/(\d+):?(\d*)\s*(AM|PM)?/i);
    if (match) {
      let hrs = parseInt(match[1], 10);
      const mins = match[2] ? match[2].padStart(2, '0') : "00";
      const ampm = match[3];
      if (ampm && ampm.toUpperCase() === "PM" && hrs < 12) hrs += 12;
      if (ampm && ampm.toUpperCase() === "AM" && hrs === 12) hrs = 0;
      timeVal = `${String(hrs).padStart(2, '0')}:${mins}`;
    }
  }
  
  return `${yyyy}-${mm}-${dd}T${timeVal}`;
};

function Avatar({ client, size = "md" }: { client: Client; size?: "sm" | "md" | "lg" }) {
  if (client.logo) {
    return (
      <span className={`avatar ${size}`} style={{ overflow: "hidden", display: "inline-flex", alignItems: "center", justifyContent: "center", background: "var(--border-color)" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={client.logo} alt={`${client.name} logo`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </span>
    );
  }
  return <span className={`avatar ${client.tone} ${size}`}>{client.initials}</span>;
}

function StageBadge({ stage }: { stage: Stage }) {
  return <span className={`badge ${stage.toLowerCase().replace(" ", "-")}`}>{stage}</span>;
}

function ClientProgressPipeline({ stage, tone }: { stage: Stage; tone: string }) {
  const stages: Stage[] = ["Proposal", "Closing", "Active work", "Delivery"];
  const currentIdx = stages.indexOf(stage);

  return (
    <div className="pipeline-container">
      {stages.map((st, idx) => {
        const isCompleted = idx < currentIdx;
        const isActive = idx === currentIdx;
        const stateClass = isCompleted ? "completed" : isActive ? "active" : "upcoming";

        return (
          <Fragment key={st}>
            <div className={`pipeline-step ${stateClass} tone-${tone}`}>
              <span className="pipeline-dot">
                {isCompleted && (
                  <svg className="pipeline-check-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </span>
              {isActive && <span className="pipeline-active-badge">{st}</span>}
            </div>
            {idx < stages.length - 1 && (
              <span className={`pipeline-line ${idx < currentIdx ? "completed" : ""} tone-${tone}`} />
            )}
          </Fragment>
        );
      })}
    </div>
  );
}

export default function Home() {
  const [clients, setClients] = useState<Client[]>([]);
  const [taskState, setTaskState] = useState<Task[]>([]);
  const [selected, setSelected] = useState<Client | null>(null);
  const [isAddOpen, setAddOpen] = useState(false);
  const [isEditOpen, setEditOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeNav, setActiveNav] = useState("Dashboard");
  const [clientFilterStage, setClientFilterStage] = useState<"All" | Stage>("All");
  const [meetingDateFilter, setMeetingDateFilter] = useState<"Today" | "Tomorrow" | "Day After Tomorrow">("Today");
  const [isLoading, setIsLoading] = useState(true);

  // Premium states
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState("Aarya's Studio");
  const [isWorkspaceOpen, setWorkspaceOpen] = useState(false);
  const [isUserMenuOpen, setUserMenuOpen] = useState(false);
  const [isHelpOpen, setHelpOpen] = useState(false);

  // Dynamic Administrator States
  const [adminName, setAdminName] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("admin_name") || "Aarya Rao";
    }
    return "Aarya Rao";
  });
  const [adminRole, setAdminRole] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("admin_role") || "Administrator";
    }
    return "Administrator";
  });
  const [adminInitials, setAdminInitials] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("admin_initials") || "AR";
    }
    return "AR";
  });
  const [adminAvatar, setAdminAvatar] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("admin_avatar") || "";
    }
    return "";
  });
  const [geminiApiKey, setGeminiApiKey] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("gemini_api_key") || "";
    }
    return "";
  });
  const [isProfileOpen, setProfileOpen] = useState(false);
  const [isSettingsOpen, setSettingsOpen] = useState(false);
  const [isVoiceOnboardOpen, setVoiceOnboardOpen] = useState(false);
  const [isVoiceSchedulerOpen, setVoiceSchedulerOpen] = useState(false);
  const [isLoggedOut, setIsLoggedOut] = useState(false);

  const handleSaveProfile = async (name: string, role: string, initials: string, avatarUrl: string) => {
    setAdminName(name);
    setAdminRole(role);
    setAdminInitials(initials);
    setAdminAvatar(avatarUrl);
    if (typeof window !== "undefined") {
      localStorage.setItem("admin_name", name);
      localStorage.setItem("admin_role", role);
      localStorage.setItem("admin_initials", initials);
      localStorage.setItem("admin_avatar", avatarUrl);
    }

    try {
      const { error } = await supabase
        .from("profiles")
        .upsert({
          id: "admin",
          name,
          role,
          initials,
          avatar_url: avatarUrl || null,
          updated_at: new Date().toISOString()
        });
      if (error) throw error;
      addToast("Profile saved and synced with Supabase!", "success");
    } catch (err) {
      console.error("Failed to sync profile to Supabase:", err);
      addToast("Profile saved locally. Run Supabase migration to sync to cloud.", "warning");
    }

    setProfileOpen(false);
  };

  // Helper to add toast notifications
  const addToast = (message: string, type: Toast["type"] = "info") => {
    const id = getNextUniqueId();
    setToasts((current) => [...current, { id, message, type }]);
    setTimeout(() => {
      setToasts((current) => current.filter((t) => t.id !== id));
    }, 4000);
  };

  const removeToast = (id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  };

  // Load clients and tasks from Supabase on mount
  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        const { data: clientsData, error: clientsError } = await supabase
          .from("clients")
          .select("*")
          .order("priority", { ascending: false });
        if (clientsError) throw clientsError;

        const { data: tasksData, error: tasksError } = await supabase
          .from("tasks")
          .select("*")
          .order("id", { ascending: false });
        if (tasksError) throw tasksError;

        // Fetch Admin profile
        try {
          const { data: profData, error: profError } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", "admin")
            .single();
          if (!profError && profData) {
            setAdminName(profData.name);
            setAdminRole(profData.role);
            setAdminInitials(profData.initials);
            setAdminAvatar(profData.avatar_url || "");
            setCurrentWorkspace(profData.workspace_name);
            setTheme(profData.theme as "light" | "dark");
            if (profData.gemini_api_key) {
              setGeminiApiKey(profData.gemini_api_key);
              localStorage.setItem("gemini_api_key", profData.gemini_api_key);
            }
          }
        } catch (profErr) {
          console.error("Failed to fetch admin profile:", profErr);
        }

        const mappedClients: Client[] = (clientsData || []).map((c) => {
          const rawClient = c as Record<string, unknown>;
          return {
            id: Number(rawClient.id),
            name: String(rawClient.name || ""),
            company: String(rawClient.company || ""),
            initials: String(rawClient.initials || ""),
            tone: String(rawClient.tone || "violet"),
            stage: rawClient.stage as Stage,
            health: rawClient.health as "green" | "amber" | "red",
            priority: Number(rawClient.priority || 0),
            nextAction: String(rawClient.next_action || ""),
            due: String(rawClient.due || ""),
            note: String(rawClient.note || ""),
            timeline: (rawClient.timeline as TimelineItem[]) || [],
            logo: rawClient.logo ? String(rawClient.logo) : undefined,
            eventType: rawClient.event_type ? (rawClient.event_type as "meeting" | "task") : "task",
            dealAmount: Number(rawClient.deal_amount || 0),
            paymentSteps: Number(rawClient.payment_steps || 1),
            paidSteps: Number(rawClient.paid_steps || 0)
          };
        });

        const mappedTasks: Task[] = (tasksData || []).map((t) => {
          const rawTask = t as Record<string, unknown>;
          return {
            id: Number(rawTask.id),
            title: String(rawTask.title || ""),
            clientId: rawTask.client_id ? Number(rawTask.client_id) : undefined,
            due: String(rawTask.due || ""),
            done: !!rawTask.done,
            priority: rawTask.priority as Task["priority"]
          };
        });

        setClients(mappedClients);
        setTaskState(mappedTasks);
      } catch (err) {
        console.error("Supabase load failed, using local fallback:", err);
        addToast("Using local backup database mode.", "warning");
        setClients(initialClients);
        setTaskState(initialTasks);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  // Sync theme with document class and Supabase
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
    localStorage.setItem("clientops-theme", theme);

    async function syncTheme() {
      try {
        await supabase
          .from("profiles")
          .upsert({
            id: "admin",
            theme,
            updated_at: new Date().toISOString()
          });
      } catch (err) {
        console.error("Failed to sync theme:", err);
      }
    }
    if (!isLoading) {
      syncTheme();
    }
  }, [theme, isLoading]);

  // Load saved theme
  useEffect(() => {
    const saved = localStorage.getItem("clientops-theme");
    const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const targetTheme = (saved === "light" || saved === "dark") ? saved : (systemDark ? "dark" : "light");
    
    const timer = setTimeout(() => {
      setTheme(targetTheme);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // Keyboard shortcut CMD+K / CTRL+K for Search focus
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        document.getElementById("search-input")?.focus();
      }
    };
    window.document.addEventListener("keydown", handleKeyDown);
    return () => window.document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const visibleClients = useMemo(() => {
    return clients.filter((client) =>
      `${client.name} ${client.company}`.toLowerCase().includes(query.toLowerCase())
    );
  }, [clients, query]);

  const doNow = useMemo(() => {
    return visibleClients.filter((client) => client.health === "red");
  }, [visibleClients]);

  const upcoming = useMemo(() => {
    return visibleClients.filter((client) => client.health !== "red");
  }, [visibleClients]);

  const pendingDeals = useMemo(() => {
    return visibleClients.filter((client) => client.stage === "Proposal" || client.stage === "Closing");
  }, [visibleClients]);

  const pendingRevenue = useMemo(() => {
    const total = pendingDeals.length * 50000;
    return (total / 100000).toFixed(1);
  }, [pendingDeals]);

  const ongoingClients = useMemo(() => {
    return visibleClients.filter((client) => client.stage === "Active work" || client.stage === "Delivery");
  }, [visibleClients]);

  const closeRate = useMemo(() => {
    if (visibleClients.length === 0) return 0;
    return Math.round((ongoingClients.length / visibleClients.length) * 100);
  }, [visibleClients, ongoingClients]);

  // Handle Mark Complete action on the Client detail slide-over
  const handleMarkComplete = async (clientId: number) => {
    let clientName = "";
    let prevAction = "";
    let updatedClient: Client | null = null;

    setClients((currentClients) =>
      currentClients.map((client) => {
        if (client.id === clientId) {
          clientName = client.name;
          prevAction = client.nextAction;

          const updatedTimeline = [
            {
              id: getNextUniqueId(),
              title: "Action completed",
              desc: `Completed follow-up action: "${client.nextAction}"`,
              date: "Today",
            },
            ...client.timeline,
          ];

          updatedClient = {
            ...client,
            nextAction: "Schedule next milestone",
            due: "Today",
            health: "green",
            priority: Math.max(10, client.priority - 25), // Reduce priority action score
            note: `Successfully completed action: "${client.nextAction}". Awaiting scope extension.`,
            timeline: updatedTimeline,
          };

          // Keep selected details matching the newly updated client
          setSelected(updatedClient);
          return updatedClient;
        }
        return client;
      })
    );

    // Cross-mark matching task in the task list
    setTaskState((currentTasks) =>
      currentTasks.map((task) => {
        if (task.clientId === clientId && task.title === prevAction) {
          return { ...task, done: true };
        }
        return task;
      })
    );

    addToast(`Action completed for ${clientName || "Client"}!`, "success");

    try {
      if (updatedClient) {
        const { error: clError } = await supabase
          .from("clients")
          .update({
            next_action: (updatedClient as Client).nextAction,
            due: (updatedClient as Client).due,
            health: (updatedClient as Client).health,
            priority: (updatedClient as Client).priority,
            note: (updatedClient as Client).note,
            timeline: (updatedClient as Client).timeline
          })
          .eq("id", clientId);
        if (clError) throw clError;
      }

      const { error: tskError } = await supabase
        .from("tasks")
        .update({ done: true })
        .eq("client_id", clientId)
        .eq("title", prevAction);
      if (tskError) throw tskError;
    } catch (err) {
      console.error("Supabase sync failed for complete action:", err);
    }
  };

  // Handle Delete Client
  const handleDeleteClient = async (clientId: number) => {
    const client = clients.find((c) => c.id === clientId);
    setClients((current) => current.filter((c) => c.id !== clientId));
    
    // Clean up associated tasks
    setTaskState((current) => current.filter((t) => t.clientId !== clientId));
    setSelected(null);
    addToast(`Removed client and associated tasks: ${client?.name || "Client"}`, "warning");

    try {
      const { error: clError } = await supabase.from("clients").delete().eq("id", clientId);
      if (clError) throw clError;
    } catch (err) {
      console.error("Supabase client deletion failed:", err);
    }
  };

  // Form submit for new client
  const handleAddClientSubmit = async (form: FormData) => {
    const name = String(form.get("name") || "New client").trim();
    const company = String(form.get("company") || "Independent").trim();
    const stage = String(form.get("stage") || "Closing") as Stage;
    const health = String(form.get("health") || "green") as "green" | "amber" | "red";
    const priority = Number(form.get("priority") || 50);
    const nextAction = String(form.get("action") || "Schedule first follow-up").trim();
    const dueDate = String(form.get("dueDate") || "");
    const dueTime = String(form.get("dueTime") || "10:00");
    const due = `${dueDate}T${dueTime}`;
    const note = String(form.get("note") || "New client added to your command center.");
    const tone = String(form.get("tone") || "violet");

    // Process logo image upload
    const logoFile = form.get("logo") as File | null;
    let logoBase64 = "";
    if (logoFile && logoFile.size > 0) {
      try {
        logoBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error("File reading error"));
          reader.readAsDataURL(logoFile);
        });
      } catch (err) {
        console.error("Failed to read logo file:", err);
      }
    }

    const initials = name
      .split(" ")
      .map((word) => word[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();

    const newClientId = getNextUniqueId();
    const newClient: Client = {
      id: newClientId,
      name,
      company,
      initials,
      tone,
      stage,
      health,
      priority,
      nextAction,
      due,
      note,
      timeline: [
        { id: getNextUniqueId(), title: "Client onboarding", desc: "Onboarded client profile to command center.", date: "Today" },
      ],
      logo: logoBase64 || undefined,
      eventType: String(form.get("eventType") || "task") as "meeting" | "task",
      dealAmount: Number(form.get("dealAmount") || 0),
      paymentSteps: Number(form.get("paymentSteps") || 1),
      paidSteps: 0
    };

    setClients((current) => [newClient, ...current]);
    setAddOpen(false);
    setSelected(newClient);
    addToast(`Client onboarded: ${name}`, "success");

    try {
      const { error: clError } = await supabase.from("clients").insert([{
        id: newClient.id,
        name: newClient.name,
        company: newClient.company,
        initials: newClient.initials,
        tone: newClient.tone,
        stage: newClient.stage,
        health: newClient.health,
        priority: newClient.priority,
        next_action: newClient.nextAction,
        due: newClient.due,
        note: newClient.note,
        timeline: newClient.timeline,
        logo: newClient.logo || null,
        event_type: newClient.eventType,
        deal_amount: newClient.dealAmount,
        payment_steps: newClient.paymentSteps,
        paid_steps: newClient.paidSteps
      }]);
      if (clError) throw clError;
    } catch (err) {
      console.error("Supabase insert client failed:", err);
      addToast("Supabase insert client failed. Please make sure the ALTER TABLE query has been run in your Supabase dashboard.", "warning");
    }
  };

  const handleEditClientSubmit = async (clientId: number, form: FormData) => {
    const name = String(form.get("name") || "").trim();
    const company = String(form.get("company") || "").trim();
    const stage = String(form.get("stage") || "Closing") as Stage;
    const health = String(form.get("health") || "green") as "green" | "amber" | "red";
    const priority = Number(form.get("priority") || 50);
    const nextAction = String(form.get("action") || "").trim();
    const dueDate = String(form.get("dueDate") || "");
    const dueTime = String(form.get("dueTime") || "10:00");
    const due = `${dueDate}T${dueTime}`;
    const note = String(form.get("note") || "");
    const tone = String(form.get("tone") || "violet");
    const eventType = String(form.get("eventType") || "task") as "meeting" | "task";
    const dealAmount = Number(form.get("dealAmount") || 0);
    const paymentSteps = Number(form.get("paymentSteps") || 1);

    const clearLogo = form.get("clearLogo") === "true";
    const logoFile = form.get("logo") as File | null;
    
    // Find current client to check original logo
    const existingClient = clients.find((c) => c.id === clientId);
    let logoBase64 = existingClient ? existingClient.logo : undefined;

    if (clearLogo) {
      logoBase64 = undefined;
    } else if (logoFile && logoFile.size > 0) {
      try {
        logoBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error("File reading error"));
          reader.readAsDataURL(logoFile);
        });
      } catch (err) {
        console.error("Failed to read logo file:", err);
      }
    }

    const initials = name
      .split(" ")
      .map((word) => word[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();

    let updatedClient: Client | null = null;

    setClients((currentClients) =>
      currentClients.map((c) => {
        if (c.id === clientId) {
          const newPaidSteps = Math.min(c.paidSteps || 0, paymentSteps);
          const updatedTimeline = [
            {
              id: getNextUniqueId(),
              title: "Client details edited",
              desc: "Updated client details in command center.",
              date: "Today",
            },
            ...c.timeline,
          ];

          updatedClient = {
            ...c,
            name,
            company,
            initials,
            tone,
            stage,
            health,
            priority,
            nextAction,
            due,
            note,
            logo: logoBase64,
            eventType,
            dealAmount,
            paymentSteps,
            paidSteps: newPaidSteps,
            timeline: updatedTimeline,
          };

          // Keep drawer selection synced
          setSelected(updatedClient);
          return updatedClient;
        }
        return c;
      })
    );

    addToast(`Client updated: ${name}`, "success");
    setEditOpen(false);

    try {
      const { error: clError } = await supabase
        .from("clients")
        .update({
          name,
          company,
          initials,
          tone,
          stage,
          health,
          priority,
          next_action: nextAction,
          due,
          note,
          logo: logoBase64 || null,
          event_type: eventType,
          deal_amount: dealAmount,
          payment_steps: paymentSteps,
          paid_steps: updatedClient ? (updatedClient as Client).paidSteps : 0,
          timeline: updatedClient ? (updatedClient as Client).timeline : [],
        })
        .eq("id", clientId);
      if (clError) throw clError;
    } catch (err) {
      console.error("Supabase update client failed:", err);
      addToast("Supabase update client failed. Please make sure the ALTER TABLE query has been run in your Supabase dashboard.", "warning");
    }
  };

  const handleUpdateClientLogo = async (clientId: number, logoBase64: string | null) => {
    setClients((prev) =>
      prev.map((c) => {
        if (c.id === clientId) {
          const updated = { ...c, logo: logoBase64 || undefined };
          setSelected(updated);
          return updated;
        }
        return c;
      })
    );

    try {
      const { error } = await supabase
        .from("clients")
        .update({ logo: logoBase64 })
        .eq("id", clientId);
      if (error) throw error;
      addToast("Client photo successfully updated!", "success");
    } catch (err) {
      console.error("Failed to update client logo:", err);
      addToast("Failed to update client photo in database.", "error");
    }
  };

  const handleTogglePayment = async (clientId: number, paidSteps: number) => {
    let clientName = "";
    let updatedClient: Client | null = null;

    setClients((currentClients) =>
      currentClients.map((client) => {
        if (client.id === clientId) {
          clientName = client.name;
          
          const amountPaid = Math.round((paidSteps / (client.paymentSteps || 1)) * (client.dealAmount || 0));
          const updatedTimeline = [
            {
              id: getNextUniqueId(),
              title: "Payment status updated",
              desc: `Updated to ${paidSteps} of ${client.paymentSteps} phases paid (Received: ₹${amountPaid.toLocaleString("en-IN")})`,
              date: "Today",
            },
            ...client.timeline,
          ];

          updatedClient = {
            ...client,
            paidSteps,
            timeline: updatedTimeline,
          };

          // Keep drawer selection synced
          setSelected(updatedClient);
          return updatedClient;
        }
        return client;
      })
    );

    addToast(`Payment updated for ${clientName || "Client"}!`, "success");

    try {
      const { error: clError } = await supabase
        .from("clients")
        .update({
          paid_steps: paidSteps,
          timeline: updatedClient ? (updatedClient as Client).timeline : []
        })
        .eq("id", clientId);
      if (clError) throw clError;
    } catch (err) {
      console.error("Supabase sync failed for payment update:", err);
      addToast("Supabase update payment failed. Please make sure the ALTER TABLE query has been run in your Supabase dashboard.", "warning");
    }
  };

  // Toggle single task completed status
  const handleToggleTask = async (taskId: number) => {
    let taskTitle = "";
    let isNowDone = false;
    let clientId: number | undefined;

    setTaskState((current) =>
      current.map((task) => {
        if (task.id === taskId) {
          taskTitle = task.title;
          isNowDone = !task.done;
          clientId = task.clientId;
          return { ...task, done: isNowDone };
        }
        return task;
      })
    );

    // If task is linked to a client, log it in their timeline!
    let updatedClient: Client | null = null;
    if (clientId) {
      setClients((currentClients) =>
        currentClients.map((c) => {
          if (c.id === clientId) {
            const dateStr = new Date().toLocaleString("default", { month: "short", day: "2-digit" });
            const logItem = {
              id: getNextUniqueId(),
              title: isNowDone ? "Task Completed" : "Task Reopened",
              desc: `Task: "${taskTitle}"`,
              date: dateStr,
            };
            updatedClient = {
              ...c,
              timeline: [logItem, ...c.timeline],
            };
            if (selected && selected.id === c.id) {
              setSelected(updatedClient);
            }
            return updatedClient;
          }
          return c;
        })
      );
    }

    addToast(
      isNowDone ? `Task completed: "${taskTitle}"` : `Task marked as active: "${taskTitle}"`,
      isNowDone ? "success" : "warning"
    );

    try {
      const { error: tskError } = await supabase
        .from("tasks")
        .update({ done: isNowDone })
        .eq("id", taskId);
      if (tskError) throw tskError;

      if (clientId && updatedClient) {
        const { error: clError } = await supabase
          .from("clients")
          .update({ timeline: (updatedClient as Client).timeline })
          .eq("id", clientId);
        if (clError) throw clError;
      }
    } catch (err) {
      console.error("Supabase task toggle sync failed:", err);
    }
  };

  // Add new task
  const handleAddTask = async (title: string, clientId?: number, priority: Task["priority"] = "medium", due: string = "Today") => {
    const newTaskId = getNextUniqueId();
    const newTask: Task = {
      id: newTaskId,
      title,
      clientId,
      due,
      done: false,
      priority,
    };

    setTaskState((current) => [newTask, ...current]);

    let updatedClient: Client | null = null;
    if (clientId) {
      setClients((currentClients) =>
        currentClients.map((c) => {
          if (c.id === clientId) {
            const logItem = {
              id: getNextUniqueId(),
              title: "Task Created",
              desc: `Deliverable task: "${title}"`,
              date: "Today",
            };
            updatedClient = {
              ...c,
              timeline: [logItem, ...c.timeline],
            };
            if (selected && selected.id === c.id) {
              setSelected(updatedClient);
            }
            return updatedClient;
          }
          return c;
        })
      );
    }

    const clientObj = clientId ? clients.find((c) => c.id === clientId) : null;
    addToast(
      clientObj ? `Added task for ${clientObj.name}: "${title}"` : `Task created: "${title}"`,
      "success"
    );

    try {
      const { error: tskError } = await supabase.from("tasks").insert([{
        id: newTask.id,
        title: newTask.title,
        client_id: newTask.clientId,
        due: newTask.due,
        done: newTask.done,
        priority: newTask.priority
      }]);
      if (tskError) throw tskError;

      if (clientId && updatedClient) {
        const { error: clError } = await supabase
          .from("clients")
          .update({ timeline: (updatedClient as Client).timeline })
          .eq("id", clientId);
        if (clError) throw clError;
      }
    } catch (err) {
      console.error("Supabase insert task failed:", err);
    }
  };

  // Delete task
  const handleDeleteTask = async (taskId: number) => {
    const matched = taskState.find((t) => t.id === taskId);
    setTaskState((current) => current.filter((t) => t.id !== taskId));
    addToast(`Deleted task: "${matched?.title || "Task"}"`, "warning");

    try {
      const { error: tskError } = await supabase.from("tasks").delete().eq("id", taskId);
      if (tskError) throw tskError;
    } catch (err) {
      console.error("Supabase delete task failed:", err);
    }
  };

  // Submit all voice scheduled actions in a single batch
  const handleVoiceScheduleSubmit = async (tasksToInsert: any[], meetingsToUpdate: any[]) => {
    // 1. Process tasks
    for (const t of tasksToInsert) {
      const newTaskId = getNextUniqueId();
      const newTask: Task = {
        id: newTaskId,
        title: t.title,
        clientId: t.clientId || undefined,
        due: t.due,
        done: false,
        priority: "medium",
      };
      
      setTaskState((current) => [newTask, ...current]);
      
      try {
        const { error } = await supabase.from("tasks").insert([{
          id: newTask.id,
          title: newTask.title,
          client_id: newTask.clientId,
          due: newTask.due,
          done: newTask.done,
          priority: newTask.priority
        }]);
        if (error) throw error;
      } catch (err) {
        console.error("Supabase batch insert task failed:", err);
      }
    }

    // 2. Process meetings
    for (const m of meetingsToUpdate) {
      if (!m.clientId) continue;
      
      setClients((currentClients) =>
        currentClients.map((c) => {
          if (c.id === m.clientId) {
            const logItem = {
              id: getNextUniqueId(),
              title: "Meeting Scheduled",
              desc: `Spoken agenda: "${m.title}"`,
              date: "Today",
            };
            const updated: Client = {
              ...c,
              nextAction: m.title,
              due: m.due,
              eventType: "meeting",
              timeline: [logItem, ...c.timeline],
            };
            if (selected && selected.id === c.id) {
              setSelected(updated);
            }
            return updated;
          }
          return c;
        })
      );

      try {
        const matched = clients.find(c => c.id === m.clientId);
        if (matched) {
          const logItem = {
            id: getNextUniqueId(),
            title: "Meeting Scheduled",
            desc: `Spoken agenda: "${m.title}"`,
            date: "Today",
          };
          const { error } = await supabase
            .from("clients")
            .update({
              next_action: m.title,
              due: m.due,
              event_type: "meeting",
              timeline: [logItem, ...matched.timeline]
            })
            .eq("id", m.clientId);
          if (error) throw error;
        }
      } catch (err) {
        console.error("Supabase batch meeting update failed:", err);
      }
    }
  };

  const handleVoiceOnboardingSubmit = async (data: Partial<Client>) => {
    const name = data.name || "New client";
    const company = data.company || "Independent";
    const dealAmount = data.dealAmount || 0;
    const paymentSteps = data.paymentSteps || 1;
    const nextAction = data.nextAction || "Schedule first follow-up";
    const due = getFormattedDueDate(data.due || "Today");
    const tone = data.tone || "violet";
    const initials = data.initials || "CL";

    const newClientId = getNextUniqueId();
    const newClient: Client = {
      id: newClientId,
      name,
      company,
      initials,
      tone,
      stage: "Proposal",
      health: "green",
      priority: 50,
      nextAction,
      due,
      note: "Onboarded via Voice AI Copilot.",
      timeline: [
        { id: getNextUniqueId(), title: "Voice onboarding", desc: "Profile onboarded using Voice AI Copilot dialogue.", date: "Today" },
      ],
      eventType: "task",
      dealAmount,
      paymentSteps,
      paidSteps: 0
    };

    setClients((current) => [newClient, ...current]);
    setSelected(newClient);

    try {
      const { error } = await supabase.from("clients").insert([{
        id: newClient.id,
        name: newClient.name,
        company: newClient.company,
        initials: newClient.initials,
        tone: newClient.tone,
        stage: newClient.stage,
        health: newClient.health,
        priority: newClient.priority,
        next_action: newClient.nextAction,
        due: newClient.due,
        note: newClient.note,
        timeline: newClient.timeline,
        event_type: newClient.eventType,
        deal_amount: newClient.dealAmount,
        payment_steps: newClient.paymentSteps,
        paid_steps: newClient.paidSteps
      }]);
      if (error) throw error;
    } catch (err) {
      console.error("Supabase insert voice client failed:", err);
    }
  };

  // Parse clients to populate dynamic events on the calendar
  const calendarEvents = useMemo(() => {
    return clients.map((client) => {
      // Check if due is a valid ISO date
      if (client.due.includes("-") || client.due.includes("T")) {
        try {
          const dateObj = new Date(client.due);
          if (!isNaN(dateObj.getTime())) {
            const day = dateObj.getDate();
            const month = dateObj.getMonth();
            const year = dateObj.getFullYear();
            const time = dateObj.toLocaleTimeString("default", { hour: "numeric", minute: "2-digit" });
            return {
              day,
              month,
              year,
              time,
              title: client.nextAction,
              client,
            };
          }
        } catch {
          // Fallback to legacy parser below
        }
      }

      // Legacy fallback parser for static mock data
      const baseDate = 20; // Hardcoded default calendar reference date is July 20, 2026
      let day = baseDate;
      let time = "10:00 AM";
      if (client.due.toLowerCase().includes("today")) {
        day = baseDate;
        time = "11:00 AM";
      } else if (client.due.toLowerCase().includes("tomorrow")) {
        day = baseDate + 1;
        time = "2:30 PM";
      } else if (client.due.toLowerCase().includes("in 2 days")) {
        day = baseDate + 2;
        time = "4:30 PM";
      } else if (client.due.toLowerCase().includes("in 3 days")) {
        day = baseDate + 3;
        time = "10:00 AM";
      } else if (client.due.toLowerCase().includes("overdue")) {
        day = baseDate - 2;
        time = "9:30 AM";
      } else if (client.due.toLowerCase().includes("week")) {
        day = baseDate + 4;
        time = "12:00 PM";
      }
      return {
        day,
        month: 6, // July
        year: 2026,
        time,
        title: client.nextAction,
        client,
      };
    });
  }, [clients]);

  const filteredMeetings = useMemo(() => {
    const targetDate = new Date();
    if (meetingDateFilter === "Tomorrow") {
      targetDate.setDate(targetDate.getDate() + 1);
    } else if (meetingDateFilter === "Day After Tomorrow") {
      targetDate.setDate(targetDate.getDate() + 2);
    }
    return calendarEvents.filter((ev) => 
      ev.day === targetDate.getDate() &&
      ev.month === targetDate.getMonth() &&
      ev.year === targetDate.getFullYear() &&
      ev.client.eventType === "meeting"
    );
  }, [calendarEvents, meetingDateFilter]);

  return (
    <main className="shell">
      {/* Toast Notifications */}
      <div className="toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast ${toast.type}`}>
            <InformationCircleIcon />
            <span>{toast.message}</span>
            <button className="toast-close" onClick={() => removeToast(toast.id)}>
              <XMarkIcon style={{ width: 14 }} />
            </button>
          </div>
        ))}
      </div>

      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">C</span>
          <span>
            Client<span>Ops</span>
          </span>
        </div>

        <div className="workspace-container">
          <p className="workspace-label">WORKSPACE</p>
          <button className="workspace-switch" onClick={() => setWorkspaceOpen(!isWorkspaceOpen)}>
            <span className="mini-avatar">{currentWorkspace[0] || "W"}</span> {currentWorkspace} <ChevronRightIcon style={{ transform: isWorkspaceOpen ? 'rotate(90deg)' : 'none' }} />
          </button>

          {isWorkspaceOpen && (
            <div className="dropdown-menu">
              {["Aarya's Studio", "Vanguard Ops", "Design Lab", "Pixel & Code Co."].map((ws) => (
                <button
                  key={ws}
                  className="dropdown-item"
                  onClick={() => {
                    setCurrentWorkspace(ws);
                    setWorkspaceOpen(false);
                    addToast(`Switched to workspace: ${ws}`, "success");
                  }}
                >
                  <SparklesIcon style={{ width: 14 }} /> {ws}
                </button>
              ))}
            </div>
          )}
        </div>

        <nav aria-label="Main navigation" className="sidebar-nav">
          {[
            { label: "Dashboard", icon: Squares2X2Icon },
            { label: "Clients", icon: UserGroupIcon },
            { label: "Tasks", icon: ClipboardDocumentCheckIcon },
            { label: "Calendar", icon: CalendarDaysIcon },
          ].map(({ label, icon: Icon }) => (
            <button
              key={label}
              className={`nav-item ${activeNav === label ? "active" : ""}`}
              onClick={() => {
                setActiveNav(label);
                if (label === "Clients") {
                  setClientFilterStage("All");
                }
              }}
            >
              <Icon />
              {label}
              {label === "Tasks" && <span className="nav-count">{taskState.filter((t) => !t.done).length}</span>}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <button className="help-link" onClick={() => setHelpOpen(true)}>
            💡 <span>Help & resources</span>
          </button>

          <div className="user-card">
            {adminAvatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img 
                src={adminAvatar} 
                alt={adminName} 
                className="user-avatar" 
                style={{ width: "32px", height: "32px", borderRadius: "50%", objectFit: "cover" }}
              />
            ) : (
              <span className="user-avatar">{adminInitials}</span>
            )}
            <div className="user-info">
              <strong>{adminName}</strong>
              <small>{adminRole}</small>
            </div>
            <button
              className="menu-trigger"
              aria-label="Open account menu"
              onClick={() => setUserMenuOpen(!isUserMenuOpen)}
            >
              •••
            </button>

            {isUserMenuOpen && (
              <div className="user-dropdown">
                <button
                  className="dropdown-item"
                  onClick={() => {
                    setUserMenuOpen(false);
                    setProfileOpen(true);
                  }}
                >
                  My Profile
                </button>
                <button
                  className="dropdown-item"
                  onClick={() => {
                    setUserMenuOpen(false);
                    setSettingsOpen(true);
                  }}
                >
                  Settings
                </button>
                <button
                  className="dropdown-item"
                  onClick={() => {
                    setUserMenuOpen(false);
                    setIsLoggedOut(true);
                    addToast("Logged out successfully.", "warning");
                  }}
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      <section className="content">
        <header className="topbar">
          <div>
            <p className="eyebrow">MONDAY, JULY 20</p>
            <h1>
              {activeNav === "Dashboard" ? (
                <>
                  Good morning, Aarya <span className="accent">✦</span>
                </>
              ) : (
                activeNav
              )}
            </h1>
            <p className="subhead">
              {activeNav === "Dashboard"
                ? "Here’s what needs your attention today."
                : activeNav === "Clients"
                ? "Every relationship, work item, and next action in one place."
                : activeNav === "Tasks"
                ? "Keep client work moving, one task at a time."
                : "Your meetings, follow-ups, and delivery deadlines."}
            </p>
          </div>

          <div className="top-actions">
            {isLoading && (
              <span className="loading-indicator" style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "11px", color: "var(--purple)", fontWeight: 700, marginRight: "12px" }}>
                <span className="spinner-dot" style={{ width: 8, height: 8, borderRadius: "50%", background: "currentColor", animation: "pulseGlow 1s infinite alternate" }} />
                Syncing Supabase...
              </span>
            )}
            <div className="search-container">
              <label className="search">
                <MagnifyingGlassIcon />
                <input
                  id="search-input"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search clients... (Ctrl+K)"
                />
                {query ? (
                  <button className="clear-search-btn" onClick={() => setQuery("")}>
                    <XMarkIcon style={{ width: 14 }} />
                  </button>
                ) : (
                  <kbd>⌘K</kbd>
                )}
              </label>
            </div>

            <button
              className="icon-button"
              aria-label="Theme toggle"
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            >
              {theme === "light" ? <MoonIcon /> : <SunIcon />}
            </button>

            <button
              className="icon-button"
              aria-label="Notifications"
              onClick={() => addToast("You have 3 unread priority follow-ups.", "info")}
            >
              <BellIcon />
              <i />
            </button>

            <button 
              type="button"
              className="primary-button" 
              style={{ background: "linear-gradient(135deg, var(--purple), var(--sky))", display: "inline-flex", gap: "6px" }}
              onClick={() => {
                if (!geminiApiKey) {
                  addToast("Please configure your Gemini API Key in Settings first!", "warning");
                  setSettingsOpen(true);
                  return;
                }
                setVoiceOnboardOpen(true);
              }}
            >
              🎙️ Voice Onboard
            </button>
            <button className="primary-button" onClick={() => setAddOpen(true)}>
              <PlusIcon /> Add client
            </button>
          </div>
        </header>

        <div hidden={activeNav !== "Dashboard"}>

          <section className="stats" aria-label="Business snapshot">
            <article>
              <p>Active clients</p>
              <strong>{clients.length}</strong>
              <span className="positive">↑ 2 this month</span>
            </article>
            <article>
              <p>Pending revenue</p>
              <strong>₹{pendingRevenue}L</strong>
              <span>Across {pendingDeals.length} active {pendingDeals.length === 1 ? "deal" : "deals"}</span>
            </article>
            <article>
              <p>Due this week</p>
              <strong>{clients.filter((c) => c.health === "red" || c.health === "amber").length}</strong>
              <span className="warning">Follow-up needed</span>
            </article>
            <article>
              <p>Close rate</p>
              <strong>{closeRate}%</strong>
              <span className={closeRate > 0 ? "positive" : ""}>
                {visibleClients.length === 0
                  ? "No deals onboarded"
                  : `${ongoingClients.length} of ${visibleClients.length} deals closed`}
              </span>
            </article>
          </section>


          <div className="dashboard-grid">
            <section className="panel span-2" id="do-now">
              <div className="section-heading">
                <div>
                  <span className="dot red" />
                  <h2>Do now</h2>
                  <p>Overdue or due today</p>
                </div>
                <button
                  onClick={() => {
                    setClientFilterStage("All");
                    setActiveNav("Clients");
                    addToast("Viewing all client profiles", "info");
                  }}
                >
                  View all <ChevronRightIcon />
                </button>
              </div>

              <div className="action-list">
                {doNow.map((client) => (
                  <button className="action-card" key={client.id} onClick={() => setSelected(client)}>
                    <Avatar client={client} />
                    <div className="action-main">
                      <span className="overdue">
                        <ClockIcon /> {formatDueLabel(client.due)}
                      </span>
                      <strong>{client.nextAction}</strong>
                      <p>
                        {client.name} · {client.company}
                      </p>
                    </div>
                    <StageBadge stage={client.stage} />
                    <ChevronRightIcon className="chevron" />
                  </button>
                ))}
                {doNow.length === 0 && <div className="empty">No urgent client actions. You&apos;re all caught up.</div>}
              </div>
            </section>

            <section className="panel tasks-panel">
              <div className="section-heading">
                <div>
                  <span className="dot purple" />
                  <h2>My tasks</h2>
                  <p>{taskState.filter((t) => !t.done).length} tasks remaining</p>
                </div>
                <button onClick={() => setActiveNav("Tasks")}>
                  View all <ChevronRightIcon />
                </button>
              </div>

              <div className="task-list">
                {/* Quick Add input at the top of Dashboard widget */}
                <form
                  className="task-quick-add"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const input = e.currentTarget.elements.namedItem("title") as HTMLInputElement;
                    const title = input.value.trim();
                    if (title) {
                      handleAddTask(title);
                      input.value = "";
                    }
                  }}
                >
                  <input name="title" placeholder="Add a quick task... [Enter]" required />
                </form>

                {taskState.map((task) => {
                  const assocClient = clients.find((c) => c.id === task.clientId);
                  return (
                    <label key={task.id} className={`task-row ${task.done ? "done" : ""}`}>
                      <input
                        type="checkbox"
                        checked={task.done}
                        onChange={() => handleToggleTask(task.id)}
                      />
                      <span className="check">
                        <CheckCircleIcon />
                      </span>
                      <span>
                        <strong>{task.title}</strong>
                        <small>
                          {assocClient ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setSelected(assocClient);
                              }}
                              style={{
                                border: 0,
                                background: "none",
                                padding: 0,
                                color: "inherit",
                                font: "inherit",
                                cursor: "pointer",
                                textDecoration: "underline",
                                textAlign: "left"
                              }}
                            >
                              {assocClient.name}
                            </button>
                          ) : (
                            "General Task"
                          )}{" "}
                          · <em className={task.due === "Overdue" ? "red-text" : ""}>{task.due}</em>
                        </small>
                      </span>
                    </label>
                  );
                })}
              </div>
            </section>

            <section className="panel meetings-panel">
              <div className="section-heading" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <span className="dot blue" />
                  <h2>Meetings</h2>
                  <p>{filteredMeetings.length} {filteredMeetings.length === 1 ? "meeting" : "meetings"} scheduled</p>
                </div>
                
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div className="tab-pills" style={{ display: "inline-flex", background: "var(--bg-card-hover)", borderRadius: "8px", padding: "2px", border: "1px solid var(--border-color)" }}>
                    <button 
                      className={meetingDateFilter === "Today" ? "active" : ""} 
                      onClick={() => setMeetingDateFilter("Today")}
                      style={{ padding: "4px 8px", fontSize: "11px", fontWeight: 600, border: 0, borderRadius: "6px", background: meetingDateFilter === "Today" ? "var(--purple)" : "transparent", color: meetingDateFilter === "Today" ? "#fff" : "var(--text-muted)", cursor: "pointer", outline: 0 }}
                    >
                      Today
                    </button>
                    <button 
                      className={meetingDateFilter === "Tomorrow" ? "active" : ""} 
                      onClick={() => setMeetingDateFilter("Tomorrow")}
                      style={{ padding: "4px 8px", fontSize: "11px", fontWeight: 600, border: 0, borderRadius: "6px", background: meetingDateFilter === "Tomorrow" ? "var(--purple)" : "transparent", color: meetingDateFilter === "Tomorrow" ? "#fff" : "var(--text-muted)", cursor: "pointer", outline: 0 }}
                    >
                      Tomorrow
                    </button>
                    <button 
                      className={meetingDateFilter === "Day After Tomorrow" ? "active" : ""} 
                      onClick={() => setMeetingDateFilter("Day After Tomorrow")}
                      style={{ padding: "4px 8px", fontSize: "11px", fontWeight: 600, border: 0, borderRadius: "6px", background: meetingDateFilter === "Day After Tomorrow" ? "var(--purple)" : "transparent", color: meetingDateFilter === "Day After Tomorrow" ? "#fff" : "var(--text-muted)", cursor: "pointer", outline: 0 }}
                    >
                      Day after tom.
                    </button>
                  </div>

                  <button onClick={() => setActiveNav("Calendar")} style={{ display: "flex", alignSelf: "center", background: "none", border: 0, color: "var(--text-muted)", cursor: "pointer", padding: "4px" }}>
                    <CalendarDaysIcon style={{ width: 16, height: 16 }} />
                  </button>
                </div>
              </div>

              <div className="meeting-list" style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "16px" }}>
                {filteredMeetings.map((event, index) => (
                  <div className="meeting-card" key={index}>
                    <div className="meeting-time">
                      <strong>{event.time.split(" ")[0]}</strong>
                      <span>{event.time.split(" ")[1] || ""}</span>
                    </div>
                    <div className={`meeting-line ${index % 2 === 1 ? "muted" : ""}`} />
                    <Avatar client={event.client} />
                    <div style={{ flex: 1 }}>
                      <strong>{event.title}</strong>
                      <p>{event.client.company || "Independent"} · {event.client.name}</p>
                    </div>
                    <button
                      className="meet-button"
                      onClick={() => {
                        setSelected(event.client);
                        addToast(`Viewing details for ${event.client.name}`, "info");
                      }}
                    >
                      Details
                    </button>
                  </div>
                ))}
                {filteredMeetings.length === 0 && (
                  <div className="empty" style={{ padding: "32px 16px", textAlign: "center", color: "var(--text-muted)", fontSize: "12px" }}>
                    No meetings scheduled for {meetingDateFilter === "Day After Tomorrow" ? "day after tom." : meetingDateFilter.toLowerCase()}.
                  </div>
                )}
              </div>
            </section>

            <section className="panel span-2 upcoming-panel">
              <div className="section-heading">
                <div>
                  <span className="dot orange" />
                  <h2>Prepare for tomorrow</h2>
                  <p>Get these ready before your next meetings</p>
                </div>
                <button onClick={() => setActiveNav("Calendar")}>
                  View calendar <ChevronRightIcon />
                </button>
              </div>

              <div className="upcoming-grid">
                {upcoming.slice(0, 3).map((client) => (
                  <button className="client-card" key={client.id} onClick={() => setSelected(client)}>
                    <div className="client-card-top">
                      <Avatar client={client} />
                      <span className="health">
                        <i className={client.health} /> {client.priority}
                      </span>
                    </div>
                    <strong>{client.company || "Independent"}</strong>
                    <p>{client.name}</p>
                    <div className="next-action">
                      <small>NEXT ACTION</small>
                      <span>{client.nextAction}</span>
                      <em>{formatDueLabel(client.due)}</em>
                    </div>
                  </button>
                ))}
              </div>
            </section>

            <section className="panel all-clients-panel">
              <div className="section-heading">
                <div>
                  <span className="dot purple" />
                  <h2>All ongoing client work</h2>
                  <p>Every client currently in delivery or active work</p>
                </div>
                <button
                  onClick={() => {
                    setClientFilterStage("All");
                    setActiveNav("Clients");
                  }}
                >
                  View clients <ChevronRightIcon />
                </button>
              </div>

              <div className="ongoing-list">
                {ongoingClients.map((client) => (
                  <button className="ongoing-row" key={client.id} onClick={() => setSelected(client)}>
                    <Avatar client={client} size="sm" />
                    <span className="ongoing-client">
                      <strong>{client.company || "Independent"}</strong>
                      <small>{client.name}</small>
                    </span>
                    <ClientProgressPipeline stage={client.stage} tone={client.tone} />
                    <span className="ongoing-action">
                      <small>UP NEXT</small>
                      <strong>{client.nextAction}</strong>
                    </span>
                    <span className={`due-label ${client.health}`}>
                      <i /> {formatDueLabel(client.due)}
                    </span>
                    <ChevronRightIcon className="chevron" />
                  </button>
                ))}
                {ongoingClients.length === 0 && (
                  <div className="empty">No ongoing client work matches your search.</div>
                )}
              </div>
            </section>

            <section className="panel closing-panel">
              <div className="section-heading">
                <div>
                  <span className="dot green" />
                  <h2>Closing soon</h2>
                  <p>High intent opportunities</p>
                </div>
                <button
                  onClick={() => {
                    setClientFilterStage("Closing");
                    setActiveNav("Clients");
                    addToast("Showing closing pipeline", "info");
                  }}
                >
                  Pipeline <ChevronRightIcon />
                </button>
              </div>

              {clients
                .filter((client) => client.stage === "Closing")
                .map((client) => (
                  <button className="closing-row" key={client.id} onClick={() => setSelected(client)}>
                    <Avatar client={client} size="sm" />
                    <span className="closing-info">
                      <strong>{client.company || "Independent"}</strong>
                      <small>{client.name}</small>
                    </span>
                    <b>₹75k</b>
                    <ChevronRightIcon className="chevron" />
                  </button>
                ))}
            </section>
          </div>
        </div>

        {activeNav === "Clients" && (
          <ClientsPage
            clients={visibleClients}
            onOpen={setSelected}
            stage={clientFilterStage}
            setStage={setClientFilterStage}
          />
        )}

        {activeNav === "Tasks" && (
          <TasksPage
            tasks={taskState}
            clients={clients}
            onToggle={handleToggleTask}
            onDelete={handleDeleteTask}
            onAddTask={handleAddTask}
            onStartVoiceScheduler={() => {
              if (!geminiApiKey) {
                addToast("Please configure your Gemini API Key in Settings first!", "warning");
                setSettingsOpen(true);
                return;
              }
              setVoiceSchedulerOpen(true);
            }}
          />
        )}

        {activeNav === "Calendar" && (
          <CalendarPage
            onOpen={setSelected}
            events={calendarEvents}
            tasks={taskState}
            clients={clients}
            onToggleTask={handleToggleTask}
          />
        )}
      </section>

      {/* Client Detail Slide-out Drawer Panel */}
      {selected && (
        <ClientPanel
          client={selected}
          onClose={() => setSelected(null)}
          onMarkComplete={handleMarkComplete}
          onDelete={handleDeleteClient}
          clientTasks={taskState.filter((task) => task.clientId === selected.id)}
          onToggleTask={handleToggleTask}
          onAddTask={handleAddTask}
          onTogglePayment={handleTogglePayment}
          onEdit={() => setEditOpen(true)}
          onUpdateLogo={handleUpdateClientLogo}
        />
      )}

      {/* Add Client Dialog Modal */}
      {isAddOpen && <AddClientModal onClose={() => setAddOpen(false)} onSubmit={handleAddClientSubmit} />}

      {/* Edit Client Dialog Modal */}
      {isEditOpen && selected && (
        <EditClientModal
          client={selected}
          onClose={() => setEditOpen(false)}
          onSubmit={(form) => handleEditClientSubmit(selected.id, form)}
        />
      )}

      {/* Help & Resources Dialog Modal */}
      {isHelpOpen && <HelpModal onClose={() => setHelpOpen(false)} />}

      {/* Profile Dialog Modal */}
      {isProfileOpen && (
        <ProfileModal
          adminName={adminName}
          adminRole={adminRole}
          adminInitials={adminInitials}
          adminAvatar={adminAvatar}
          onClose={() => setProfileOpen(false)}
          onSave={handleSaveProfile}
        />
      )}

      {/* Settings Dialog Modal */}
      {isSettingsOpen && (
        <SettingsModal
          currentWorkspace={currentWorkspace}
          onClose={() => setSettingsOpen(false)}
          onSaveWorkspace={async (ws, gKey) => {
            setCurrentWorkspace(ws);
            setGeminiApiKey(gKey);
            if (typeof window !== "undefined") {
              localStorage.setItem("gemini_api_key", gKey);
            }
            try {
              const { error } = await supabase
                .from("profiles")
                .upsert({
                  id: "admin",
                  workspace_name: ws,
                  gemini_api_key: gKey,
                  updated_at: new Date().toISOString()
                });
              if (error) throw error;
              addToast(`Settings updated and synced!`, "success");
            } catch (err) {
              console.error("Failed to sync settings:", err);
              addToast(`Settings updated locally!`, "success");
            }
          }}
          theme={theme}
          setTheme={setTheme}
          geminiApiKey={geminiApiKey}
        />
      )}

      {/* Voice Onboarding Copilot Modal */}
      {isVoiceOnboardOpen && (
        <VoiceOnboardModal
          onClose={() => setVoiceOnboardOpen(false)}
          onSubmit={handleVoiceOnboardingSubmit}
          addToast={addToast}
        />
      )}

      {/* Smart Voice Scheduler Modal */}
      {isVoiceSchedulerOpen && (
        <VoiceSchedulerModal
          onClose={() => setVoiceSchedulerOpen(false)}
          onSubmit={handleVoiceScheduleSubmit}
          clients={clients}
          geminiApiKey={geminiApiKey}
          addToast={addToast}
        />
      )}

      {/* Welcome Lock Screen */}
      {isLoggedOut && (
        <LockScreen
          adminName={adminName}
          adminInitials={adminInitials}
          adminAvatar={adminAvatar}
          onUnlock={() => {
            setIsLoggedOut(false);
            addToast("Welcome back!", "success");
          }}
        />
      )}
    </main>
  );
}

// Client details profile drawer sub-component
function ClientPanel({
  client,
  onClose,
  onMarkComplete,
  onDelete,
  clientTasks,
  onToggleTask,
  onAddTask,
  onTogglePayment,
  onEdit,
  onUpdateLogo,
}: {
  client: Client;
  onClose: () => void;
  onMarkComplete: (id: number) => void;
  onDelete: (id: number) => void;
  clientTasks: Task[];
  onToggleTask: (taskId: number) => void;
  onAddTask: (title: string, clientId: number) => void;
  onTogglePayment: (clientId: number, paidSteps: number) => void;
  onEdit: () => void;
  onUpdateLogo: (clientId: number, logoBase64: string | null) => Promise<void>;
}) {
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label={`${client.name} client profile`}>
      <aside className="client-panel">
        <button className="close" onClick={onClose} aria-label="Close profile">
          <XMarkIcon />
        </button>

        <div className="profile-hero">
          <div style={{ position: "relative", cursor: "pointer", display: "inline-block" }} title="Change photo">
            <Avatar client={client} size="lg" />
            <label 
              htmlFor="direct-logo-upload" 
              style={{ 
                position: "absolute", 
                bottom: "-2px", 
                right: "-2px", 
                background: "var(--purple)", 
                color: "#ffffff", 
                borderRadius: "50%", 
                width: "24px", 
                height: "24px", 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center", 
                boxShadow: "0 2px 4px rgba(0,0,0,0.15)",
                cursor: "pointer"
              }}
            >
              <PencilIcon style={{ width: 12, height: 12 }} />
            </label>
            <input 
              id="direct-logo-upload" 
              type="file" 
              accept="image/*" 
              style={{ display: "none" }} 
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onloadend = () => {
                    onUpdateLogo(client.id, reader.result as string);
                  };
                  reader.readAsDataURL(file);
                }
              }}
            />
          </div>
          <div>
            <StageBadge stage={client.stage} />
            <h2>{client.company || "Independent"}</h2>
            <p>{client.name}</p>
            {client.logo && (
              <button
                type="button"
                onClick={() => {
                  if (confirm("Remove current photo?")) {
                    onUpdateLogo(client.id, null);
                  }
                }}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--rose)",
                  fontSize: "11px",
                  cursor: "pointer",
                  marginTop: "4px",
                  padding: 0,
                  display: "block"
                }}
              >
                Remove photo
              </button>
            )}
          </div>
        </div>

        <div className="profile-score">
          <span>PRIORITY SCORE</span>
          <strong>
            {client.priority}
            <small>/100</small>
          </strong>
          <i className={client.health}>
            {client.health === "red" ? "At risk" : client.health === "amber" ? "Needs attention" : "On track"}
          </i>
        </div>

        <section className="next-panel">
          <div className="section-kicker">NEXT ACTION</div>
          <h3>{client.nextAction}</h3>
          <p>{client.note}</p>
          <div>
            <span>
              <ClockIcon /> {formatDueLabel(client.due)}
            </span>
            {client.nextAction !== "Schedule next milestone" && (
              <button onClick={() => onMarkComplete(client.id)}>Mark complete</button>
            )}
          </div>
        </section>

        <section className="payment-panel" style={{ marginTop: "20px", padding: "16px", background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Payment Milestones
            </span>
            <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--purple)" }}>
              {client.paidSteps || 0} of {client.paymentSteps || 1} Paid
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "16px", background: "var(--bg-card-hover)", padding: "12px", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
            <div>
              <small style={{ fontSize: "10px", color: "var(--text-muted)", display: "block" }}>TOTAL VALUE</small>
              <strong style={{ fontSize: "15px", color: "var(--text-main)" }}>₹{client.dealAmount?.toLocaleString("en-IN") || 0}</strong>
            </div>
            <div>
              <small style={{ fontSize: "10px", color: "var(--text-muted)", display: "block" }}>REMAINING DUE</small>
              <strong style={{ fontSize: "15px", color: "var(--rose)" }}>
                ₹{((client.dealAmount || 0) - (((client.paidSteps || 0) / (client.paymentSteps || 1)) * (client.dealAmount || 0))).toLocaleString("en-IN")}
              </strong>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {Array.from({ length: client.paymentSteps || 1 }).map((_, stepIdx) => {
              const stepNum = stepIdx + 1;
              const isPaid = stepNum <= (client.paidSteps || 0);
              const phaseAmount = Math.round((client.dealAmount || 0) / (client.paymentSteps || 1));
              
              return (
                <label 
                  key={stepIdx} 
                  style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px", border: "1px solid var(--border-color)", borderRadius: "8px", background: isPaid ? "var(--bg-card-hover)" : "var(--bg-card)", cursor: "pointer", transition: "all 0.2s", margin: 0 }}
                >
                  <input 
                    type="checkbox" 
                    checked={isPaid}
                    onChange={(e) => {
                      const targetPaidSteps = e.target.checked ? stepNum : stepNum - 1;
                      onTogglePayment(client.id, targetPaidSteps);
                    }}
                    style={{ width: "16px", height: "16px", accentColor: "var(--purple)", cursor: "pointer", margin: 0 }}
                  />
                  <span style={{ textDecoration: isPaid ? "line-through" : "none", color: isPaid ? "var(--text-muted)" : "var(--text-main)", fontSize: "13px", display: "flex", justifyContent: "space-between", flex: 1 }}>
                    <strong>Phase {stepNum}</strong>
                    <span>₹{phaseAmount.toLocaleString("en-IN")}</span>
                  </span>
                </label>
              );
            })}
          </div>
        </section>

        {/* Dynamic tasks section specific to client */}
        <section className="client-tasks-section">
          <div className="client-tasks-header">
            <h3>Tasks Checklist</h3>
            <span>{clientTasks.filter((t) => !t.done).length} active</span>
          </div>
          <div className="client-tasks-list">
            {clientTasks.map((task) => (
              <label key={task.id} className={`client-task-row ${task.done ? "done" : ""}`}>
                <input
                  type="checkbox"
                  checked={task.done}
                  onChange={() => onToggleTask(task.id)}
                />
                <span>{task.title}</span>
              </label>
            ))}
            {clientTasks.length === 0 && (
              <div className="empty" style={{ padding: "10px 0" }}>No deliverables set.</div>
            )}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const input = e.currentTarget.elements.namedItem("taskTitle") as HTMLInputElement;
              const title = input.value.trim();
              if (title) {
                onAddTask(title, client.id);
                input.value = "";
              }
            }}
          >
            <input
              name="taskTitle"
              className="client-task-add-input"
              placeholder="Add client task... [Enter]"
              required
            />
          </form>
        </section>

        <section className="profile-section">
          <h3>Client timeline</h3>
          <ol>
            {client.timeline.map((item) => (
              <li key={item.id}>
                <i />
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.desc}</p>
                  <time>{item.date}</time>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <div style={{ marginTop: "auto", paddingTop: "30px", display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          <button
            onClick={onEdit}
            style={{
              background: "var(--bg-card-hover)",
              color: "var(--text-main)",
              border: "1px solid var(--border-color)",
              borderRadius: "8px",
              padding: "8px 14px",
              fontWeight: 600,
              fontSize: "12px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <PencilIcon style={{ width: 14 }} /> Edit Details
          </button>
          <button
            onClick={() => {
              if (confirm(`Are you sure you want to delete ${client.name}?`)) {
                onDelete(client.id);
              }
            }}
            style={{
              background: "transparent",
              color: "var(--rose)",
              border: "1px solid rgba(244, 63, 94, 0.2)",
              borderRadius: "8px",
              padding: "8px 14px",
              fontWeight: 600,
              fontSize: "12px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <TrashIcon style={{ width: 14 }} /> Delete Client
          </button>
        </div>
      </aside>
    </div>
  );
}

// Add client form dialog modal sub-component
function AddClientModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (form: FormData) => void;
}) {

  return (
    <div className="overlay modal-wrap" role="dialog" aria-modal="true" aria-label="Add client">
      <form
        className="modal"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(new FormData(e.currentTarget));
        }}
      >
        <button type="button" className="close" onClick={onClose} aria-label="Close form">
          <XMarkIcon />
        </button>

        <span className="modal-icon">
          <UserGroupIcon />
        </span>
        <h2>Add a new client</h2>
        <p>Every active client relationship starts with a clear, defined next action.</p>

        <div className="modal-grid-2">
          <label>
            Client name *
            <input name="name" required placeholder="e.g. Kavya Iyer" autoFocus />
          </label>

          <label>
            Company or brand
            <input name="company" placeholder="e.g. Studio Blue" />
          </label>
        </div>

        <div className="modal-grid-2">
          <label>
            Stage
            <select name="stage" defaultValue="Closing">
              <option value="Proposal">Proposal</option>
              <option value="Closing">Closing</option>
              <option value="Active work">Active work</option>
              <option value="Delivery">Delivery</option>
            </select>
          </label>

          <label>
            Client health
            <select name="health" defaultValue="green">
              <option value="green">On track (Green)</option>
              <option value="amber">Needs attention (Amber)</option>
              <option value="red">At risk (Red)</option>
            </select>
          </label>
        </div>

        <div className="modal-grid-2">
          <label>
            Avatar theme color
            <select name="tone" defaultValue="violet">
              <option value="violet">Indigo / Violet</option>
              <option value="orange">Golden Orange</option>
              <option value="blue">Electric Blue</option>
              <option value="teal">Minty Teal</option>
              <option value="rose">Soft Rose</option>
            </select>
          </label>

          <label>
            Priority Urgency
            <select name="priority" defaultValue="70">
              <option value="90">Urgent (90/100)</option>
              <option value="70">Important (70/100)</option>
              <option value="50">Medium (50/100)</option>
              <option value="30">Low (30/100)</option>
            </select>
          </label>
        </div>

        <div className="modal-grid-2">
          <label>
            Contract Value (₹ Amount) *
            <input type="number" name="dealAmount" required defaultValue="50000" placeholder="e.g. 150000" min="0" />
          </label>
          <label>
            Payment Phases (Steps) *
            <input type="number" name="paymentSteps" required defaultValue="3" placeholder="e.g. 3" min="1" />
          </label>
        </div>

        <div className="modal-grid-2">
          <label>
            Next follow-up action *
            <input name="action" required placeholder="e.g. Send final itemized invoice" />
          </label>
          <label>
            Action Type *
            <select name="eventType" defaultValue="task">
              <option value="task">Task / Deliverable</option>
              <option value="meeting">Meeting / Call</option>
            </select>
          </label>
        </div>

        <div className="modal-grid-2">
          <label>
            Deadline Date *
            <input type="date" name="dueDate" required defaultValue={new Date().toISOString().split("T")[0]} />
          </label>
          <label>
            Deadline Time *
            <input type="time" name="dueTime" required defaultValue="10:00" />
          </label>
        </div>

        <label>
          Internal Action Note
          <textarea
            name="note"
            rows={2}
            placeholder="Add relevant context or discussion notes..."
            defaultValue="New client added to your command center."
          />
        </label>

        <label>
          Company Logo (Square Image)
          <input type="file" name="logo" accept="image/*" style={{ padding: "8px 12px" }} />
        </label>

        <div className="modal-actions">
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="primary-button" type="submit">
            <PlusIcon /> Onboard Client
          </button>
        </div>
      </form>
    </div>
  );
}

// Edit client form dialog modal sub-component
function EditClientModal({
  client,
  onClose,
  onSubmit,
}: {
  client: Client;
  onClose: () => void;
  onSubmit: (form: FormData) => void;
}) {
  let initialDate = new Date().toISOString().split("T")[0];
  let initialTime = "10:00";
  if (client.due && client.due.includes("T")) {
    const parts = client.due.split("T");
    initialDate = parts[0];
    initialTime = parts[1] ? parts[1].slice(0, 5) : "10:00";
  }

  const [clearLogo, setClearLogo] = useState(false);

  return (
    <div className="overlay modal-wrap" role="dialog" aria-modal="true" aria-label="Edit client">
      <form
        className="modal"
        onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          formData.set("clearLogo", String(clearLogo));
          onSubmit(formData);
        }}
      >
        <button type="button" className="close" onClick={onClose} aria-label="Close form">
          <XMarkIcon />
        </button>

        <span className="modal-icon">
          <PencilIcon />
        </span>
        <h2>Edit client details</h2>
        <p>Modify any profile information, actions, values, or logo attachments.</p>

        <div className="modal-grid-2">
          <label>
            Client name *
            <input name="name" required placeholder="e.g. Kavya Iyer" defaultValue={client.name} autoFocus />
          </label>

          <label>
            Company or brand
            <input name="company" placeholder="e.g. Studio Blue" defaultValue={client.company} />
          </label>
        </div>

        <div className="modal-grid-2">
          <label>
            Stage
            <select name="stage" defaultValue={client.stage}>
              <option value="Proposal">Proposal</option>
              <option value="Closing">Closing</option>
              <option value="Active work">Active work</option>
              <option value="Delivery">Delivery</option>
            </select>
          </label>

          <label>
            Client health
            <select name="health" defaultValue={client.health}>
              <option value="green">On track (Green)</option>
              <option value="amber">Needs attention (Amber)</option>
              <option value="red">At risk (Red)</option>
            </select>
          </label>
        </div>

        <div className="modal-grid-2">
          <label>
            Avatar theme color
            <select name="tone" defaultValue={client.tone}>
              <option value="violet">Indigo / Violet</option>
              <option value="orange">Golden Orange</option>
              <option value="blue">Electric Blue</option>
              <option value="teal">Minty Teal</option>
              <option value="rose">Soft Rose</option>
            </select>
          </label>

          <label>
            Priority Urgency
            <select name="priority" defaultValue={String(client.priority || 70)}>
              <option value="90">Urgent (90/100)</option>
              <option value="70">Important (70/100)</option>
              <option value="50">Medium (50/100)</option>
              <option value="30">Low (30/100)</option>
            </select>
          </label>
        </div>

        <div className="modal-grid-2">
          <label>
            Contract Value (₹ Amount) *
            <input type="number" name="dealAmount" required defaultValue={client.dealAmount || 50000} placeholder="e.g. 150000" min="0" />
          </label>
          <label>
            Payment Phases (Steps) *
            <input type="number" name="paymentSteps" required defaultValue={client.paymentSteps || 3} placeholder="e.g. 3" min="1" />
          </label>
        </div>

        <div className="modal-grid-2">
          <label>
            Next follow-up action *
            <input name="action" required placeholder="e.g. Send final itemized invoice" defaultValue={client.nextAction} />
          </label>
          <label>
            Action Type *
            <select name="eventType" defaultValue={client.eventType || "task"}>
              <option value="task">Task / Deliverable</option>
              <option value="meeting">Meeting / Call</option>
            </select>
          </label>
        </div>

        <div className="modal-grid-2">
          <label>
            Deadline Date *
            <input type="date" name="dueDate" required defaultValue={initialDate} />
          </label>
          <label>
            Deadline Time *
            <input type="time" name="dueTime" required defaultValue={initialTime} />
          </label>
        </div>

        <label>
          Internal Action Note
          <textarea
            name="note"
            rows={2}
            placeholder="Add relevant context or discussion notes..."
            defaultValue={client.note}
          />
        </label>

        <div style={{ display: "flex", flexDirection: "column", gap: "8px", border: "1px solid var(--border-color)", padding: "12px", borderRadius: "8px", background: "var(--bg-card)" }}>
          <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>Company Logo</span>
          {client.logo && !clearLogo ? (
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={client.logo} alt="Current logo" style={{ width: "40px", height: "40px", borderRadius: "6px", objectFit: "cover" }} />
              <button 
                type="button" 
                onClick={() => setClearLogo(true)}
                style={{ fontSize: "11px", color: "var(--rose)", border: "1px solid rgba(244,63,94,0.2)", background: "transparent", padding: "4px 8px", borderRadius: "6px", cursor: "pointer" }}
              >
                Clear logo
              </button>
            </div>
          ) : (
            <div>
              <input type="file" name="logo" accept="image/*" style={{ padding: "4px 0", fontSize: "12px" }} />
              {clearLogo && (
                <button 
                  type="button" 
                  onClick={() => setClearLogo(false)}
                  style={{ fontSize: "11px", color: "var(--text-muted)", border: "1px solid var(--border-color)", background: "transparent", padding: "4px 8px", borderRadius: "6px", cursor: "pointer", marginTop: "4px" }}
                >
                  Keep original logo
                </button>
              )}
            </div>
          )}
        </div>

        <div className="modal-actions" style={{ marginTop: "20px" }}>
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="primary-button" type="submit">
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
}

// Add task dialog modal sub-component
function AddTaskModal({
  clients,
  onClose,
  onSubmit,
}: {
  clients: Client[];
  onClose: () => void;
  onSubmit: (title: string, clientId: number | undefined, priority: Task["priority"], due: string) => void;
}) {
  return (
    <div className="overlay modal-wrap" role="dialog" aria-modal="true" aria-label="Add task">
      <form
        className="modal"
        onSubmit={(e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const title = (form.elements.namedItem("taskTitle") as HTMLInputElement).value.trim();
          const clientVal = (form.elements.namedItem("clientId") as HTMLSelectElement).value;
          const priority = (form.elements.namedItem("priority") as HTMLSelectElement).value as Task["priority"];
          const due = (form.elements.namedItem("due") as HTMLSelectElement).value;
          
          const clientId = clientVal === "General" ? undefined : Number(clientVal);
          onSubmit(title, clientId, priority, due);
        }}
      >
        <button type="button" className="close" onClick={onClose} aria-label="Close form">
          <XMarkIcon />
        </button>

        <span className="modal-icon" style={{ background: "var(--purple-soft)", color: "var(--purple)" }}>
          <ClipboardDocumentCheckIcon style={{ width: 22 }} />
        </span>
        <h2>Create a new task</h2>
        <p>Schedule deliverables and checklist items linked to your clients.</p>

        <label>
          Task Title *
          <input name="taskTitle" required placeholder="e.g. Design review slide deck" autoFocus />
        </label>

        <div className="modal-grid-2">
          <label>
            Client Association
            <select name="clientId" defaultValue="General">
              <option value="General">General / No Client</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>

          <label>
            Priority Level
            <select name="priority" defaultValue="medium">
              <option value="low">Low Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="high">High Priority</option>
            </select>
          </label>
        </div>

        <div className="modal-grid-2">
          <label>
            Due Deadline
            <select name="due" defaultValue="Today">
              <option value="Overdue">Overdue</option>
              <option value="Today">Today</option>
              <option value="Tomorrow">Tomorrow</option>
              <option value="Friday">Friday</option>
              <option value="This week">This week</option>
              <option value="Later">Later</option>
            </select>
          </label>
        </div>

        <div className="modal-actions">
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="primary-button" type="submit">
            Create Task
          </button>
        </div>
      </form>
    </div>
  );
}

// Help & Guides modal sub-component
function HelpModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="overlay modal-wrap" role="dialog" aria-modal="true" aria-label="Help Documentation">
      <div className="modal" style={{ width: "min(520px, 100%)" }}>
        <button type="button" className="close" onClick={onClose} aria-label="Close help">
          <XMarkIcon />
        </button>

        <span className="modal-icon" style={{ background: "var(--amber-soft)", color: "var(--amber)" }}>
          💡
        </span>
        <h2>Help & Resources</h2>
        <p>Learn how to navigate and operate the ClientOps Command Center.</p>

        <div style={{ display: "grid", gap: "16px", margin: "20px 0", fontSize: "13px", lineHeight: "1.5" }}>
          <div>
            <strong style={{ display: "block", color: "var(--purple)", marginBottom: "4px" }}>⌨️ Keyboard Shortcuts</strong>
            <p style={{ color: "var(--text-muted)" }}>
              Press <kbd style={{ padding: "1px 5px", border: "1px solid var(--border-color)", borderRadius: "4px", fontSize: "11px" }}>Ctrl + K</kbd> (or Cmd + K) from anywhere to immediately focus the global search input.
            </p>
          </div>
          <div>
            <strong style={{ display: "block", color: "var(--purple)", marginBottom: "4px" }}>⚡ Priority Actions</strong>
            <p style={{ color: "var(--text-muted)" }}>
              Clients marked with Red health are cataloged under &quot;Do now&quot;. Setting a client&apos;s action as complete shifts their health back to Green and lowers their alert priority.
            </p>
          </div>
          <div>
            <strong style={{ display: "block", color: "var(--purple)", marginBottom: "4px" }}>📅 Dynamic Calendar Integration</strong>
            <p style={{ color: "var(--text-muted)" }}>
              The Calendar screen automatically reads due dates and places action follow-ups on relevant dates in real-time. Click an event inside any calendar cell to view client profiles directly.
            </p>
          </div>
        </div>

        <div className="modal-actions">
          <button className="primary-button" onClick={onClose}>
            Got it, thanks!
          </button>
        </div>
      </div>
    </div>
  );
}

type VoiceStep = 
  | "START"
  | "ASK_NAME" 
  | "ASK_COMPANY" 
  | "ASK_AMOUNT" 
  | "ASK_STEPS" 
  | "ASK_ACTION"
  | "ASK_DUE"
  | "CONFIRM"
  | "COMPLETED";

// Voice Onboarding Modal Component
function VoiceOnboardModal({
  onClose,
  onSubmit,
  addToast,
}: {
  onClose: () => void;
  onSubmit: (client: Partial<Client>) => Promise<void>;
  addToast: (msg: string, type?: Toast["type"]) => void;
}) {
  const [step, setStep] = useState<VoiceStep>("START");
  const [clientData, setClientData] = useState<Partial<Client>>({
    name: "",
    company: "",
    dealAmount: 0,
    paymentSteps: 1,
    nextAction: "",
    due: "Today",
    tone: "violet",
    initials: "CL",
  });
  
  const [transcript, setTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [manualInputVal, setManualInputVal] = useState("");
  
  const [audioLevels, setAudioLevels] = useState<number[]>([4, 4, 4, 4, 4]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const activeUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const startVolumeTracking = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;
      
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const audioContext = new AudioCtx();
        audioContextRef.current = audioContext;
        
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 32;
        source.connect(analyser);
        
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        
        const updateVolume = () => {
          if (!analyser) return;
          analyser.getByteFrequencyData(dataArray);
          
          let total = 0;
          for (let i = 0; i < bufferLength; i++) {
            total += dataArray[i];
          }
          const average = total / bufferLength;
          
          const mappedLevels = [
            Math.max(4, Math.min(30, average * 0.3)),
            Math.max(4, Math.min(30, average * 0.6)),
            Math.max(4, Math.min(30, average * 0.8)),
            Math.max(4, Math.min(30, average * 0.5)),
            Math.max(4, Math.min(30, average * 0.2)),
          ];
          
          setAudioLevels(mappedLevels);
          animationFrameIdRef.current = requestAnimationFrame(updateVolume);
        };
        
        updateVolume();
      }
    } catch (err) {
      console.warn("Failed to track audio volume levels:", err);
    }
  };

  const stopVolumeTracking = useCallback(() => {
    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => track.stop());
      audioStreamRef.current = null;
    }
    setAudioLevels([4, 4, 4, 4, 4]);
  }, []);

  // Initialize Speech engines
  useEffect(() => {
    if (typeof window !== "undefined") {
      synthRef.current = window.speechSynthesis;
      const RecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (RecognitionClass) {
        const rec = new RecognitionClass();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = "en-US";

        rec.onresult = (e: any) => {
          let interimText = "";
          for (let i = e.resultIndex; i < e.results.length; ++i) {
            if (e.results[i].isFinal) {
              const finalVal = e.results[i][0].transcript.trim();
              setTranscript(finalVal);
              setManualInputVal(finalVal);
            } else {
              interimText += e.results[i][0].transcript;
              setManualInputVal(interimText);
            }
          }
        };

        rec.onend = () => {
          setIsListening(false);
          stopVolumeTracking();
        };

        recognitionRef.current = rec;
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (synthRef.current) {
        synthRef.current.cancel();
      }
      stopVolumeTracking();
    };
  }, [stopVolumeTracking]);

  // Stop listening helper
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      stopVolumeTracking();
    }
  }, [stopVolumeTracking]);

  // Start listening helper
  const startListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
        setIsListening(true);
        setTranscript("");
        startVolumeTracking();
      } catch (err) {
        console.warn("Recognition already started or error:", err);
      }
    }
  }, []);

  // Speaks text, and once finished, automatically starts listening
  const speakAndListen = useCallback((text: string) => {
    stopListening();
    if (!synthRef.current) return;
    
    synthRef.current.cancel(); // Cancel any current utterances
    const utterance = new SpeechSynthesisUtterance(text);
    activeUtteranceRef.current = utterance;
    
    utterance.onend = () => {
      startListening();
    };
    
    synthRef.current.speak(utterance);
  }, [stopListening, startListening]);

  // State machine step transitions
  useEffect(() => {
    if (step === "START") {
      // Just waiting for user to click "Start Session"
    } else if (step === "ASK_NAME") {
      speakAndListen("What is the client's name?");
    } else if (step === "ASK_COMPANY") {
      speakAndListen("Which company do they belong to?");
    } else if (step === "ASK_AMOUNT") {
      speakAndListen("What is the deal contract amount?");
    } else if (step === "ASK_STEPS") {
      speakAndListen("How many payment steps or phases are there?");
    } else if (step === "ASK_ACTION") {
      speakAndListen("What is the next action to do for this client?");
    } else if (step === "ASK_DUE") {
      speakAndListen("When is the next action due?");
    } else if (step === "CONFIRM") {
      speakAndListen("I have collected all details. Review the form and say save, or click confirm.");
    }
  }, [step, speakAndListen]);

  // Handle step submission
  const handleStepSubmit = (textVal: string) => {
    const cleanText = textVal.trim();
    if (!cleanText && step !== "ASK_COMPANY") return;

    const updated = { ...clientData };

    if (step === "ASK_NAME") {
      updated.name = cleanText;
      const parts = cleanText.split(" ");
      updated.initials = parts.map(p => p[0]).join("").toUpperCase().slice(0, 2) || "CL";
      const tones = ["violet", "blue", "emerald", "rose", "amber"];
      updated.tone = tones[Math.floor(Math.random() * tones.length)];
      setClientData(updated);
      setStep("ASK_COMPANY");
    } else if (step === "ASK_COMPANY") {
      updated.company = cleanText || "Independent";
      setClientData(updated);
      setStep("ASK_AMOUNT");
    } else if (step === "ASK_AMOUNT") {
      const matches = cleanText.replace(/,/g, "").match(/\d+/);
      const val = matches ? parseInt(matches[0], 10) : 0;
      updated.dealAmount = val;
      setClientData(updated);
      setStep("ASK_STEPS");
    } else if (step === "ASK_STEPS") {
      const matches = cleanText.match(/\d+/);
      const val = matches ? parseInt(matches[0], 10) : 1;
      updated.paymentSteps = val;
      setClientData(updated);
      setStep("ASK_ACTION");
    } else if (step === "ASK_ACTION") {
      updated.nextAction = cleanText;
      setClientData(updated);
      setStep("ASK_DUE");
    } else if (step === "ASK_DUE") {
      updated.due = cleanText;
      setClientData(updated);
      setStep("CONFIRM");
    }
    
    setTranscript("");
    setManualInputVal("");
  };

  const handleSave = async () => {
    stopListening();
    try {
      await onSubmit(clientData);
      setStep("COMPLETED");
      addToast("Client successfully onboarded via voice!", "success");
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      console.error(err);
      addToast("Failed to save client onboarding details.", "error");
    }
  };

  const RecognitionClass = typeof window !== "undefined" && ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  return (
    <div className="overlay modal-wrap" role="dialog" aria-modal="true" aria-label="Voice client onboarding">
      <div className="modal" style={{ width: "min(500px, 100%)", textAlign: "center" }}>
        <button 
          type="button" 
          className="close" 
          onClick={() => {
            stopListening();
            onClose();
          }} 
          aria-label="Close voice prompter"
        >
          <XMarkIcon />
        </button>

        <span className="modal-icon" style={{ background: "linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(14, 165, 233, 0.1))", color: "var(--purple)", margin: "0 auto 16px" }}>
          🎙️
        </span>
        <h2>Voice Onboarding Copilot</h2>
        <p style={{ color: "var(--text-muted)", fontSize: "12px", marginBottom: "20px" }}>
          Onboard new clients hands-free using dynamic voice checks.
        </p>

        {!RecognitionClass && (
          <div style={{ background: "rgba(244, 63, 94, 0.08)", border: "1px solid rgba(244,63,94,0.15)", borderRadius: "8px", padding: "12px", fontSize: "11px", color: "var(--rose)", marginBottom: "16px" }}>
            ⚠️ Web Speech API is not supported in this browser. You can type conversational answers in the text box below.
          </div>
        )}

        {step === "START" && (
          <div style={{ margin: "24px 0" }}>
            <p style={{ fontSize: "14px", color: "var(--text-main)", marginBottom: "20px" }}>
              Ready to begin the interactive voice setup? Unlocks the mic and audio guidance.
            </p>
            <button 
              type="button" 
              className="primary-button" 
              style={{ width: "100%", padding: "12px" }}
              onClick={() => {
                if (synthRef.current) {
                  synthRef.current.speak(new SpeechSynthesisUtterance(""));
                }
                setStep("ASK_NAME");
              }}
            >
              Start Voice Setup
            </button>
          </div>
        )}

        {step !== "START" && step !== "CONFIRM" && step !== "COMPLETED" && (
          <div style={{ margin: "20px 0" }}>
            <div style={{ display: "flex", justifyContent: "center", gap: "6px", height: "30px", alignItems: "center", marginBottom: "16px" }}>
              {audioLevels.map((level, i) => (
                <span 
                  key={i} 
                  style={{ 
                    width: "4px", 
                    height: `${level}px`, 
                    background: "var(--purple)", 
                    borderRadius: "2px", 
                    transition: "height 0.08s ease"
                  }} 
                />
              ))}
            </div>

            <div style={{ background: "var(--bg-card-hover)", padding: "16px", borderRadius: "12px", border: "1px solid var(--border-color)", marginBottom: "20px" }}>
              <small style={{ fontSize: "9px", textTransform: "uppercase", color: "var(--purple)", fontWeight: 700, display: "block", marginBottom: "8px" }}>
                Active Question
              </small>
              <strong style={{ fontSize: "16px", color: "var(--text-main)", display: "block" }}>
                {step === "ASK_NAME" && "What is the client's name?"}
                {step === "ASK_COMPANY" && "Which company do they belong to?"}
                {step === "ASK_AMOUNT" && "What is the deal contract amount?"}
                {step === "ASK_STEPS" && "How many payment steps or phases are there?"}
                {step === "ASK_ACTION" && "What is the next action to do for this client?"}
                {step === "ASK_DUE" && "When is the next action due?"}
              </strong>
            </div>

            <form 
              onSubmit={(e) => {
                e.preventDefault();
                handleStepSubmit(manualInputVal);
              }}
              style={{ display: "flex", flexDirection: "column", gap: "10px" }}
            >
              <input 
                type="text" 
                value={manualInputVal} 
                onChange={(e) => setManualInputVal(e.target.value)}
                placeholder={isListening ? "Listening... Speak your answer" : "Type answer here..."}
                style={{ width: "100%", padding: "12px 16px", background: "var(--bg-input)", border: "1px solid var(--border-color)", borderRadius: "8px", color: "var(--text-main)", fontSize: "13px", outline: 0 }}
              />
              {transcript && (
                <p style={{ fontSize: "11px", color: "var(--text-muted)", fontStyle: "italic", marginTop: "4px" }}>
                  Captured voice: &quot;{transcript}&quot;
                </p>
              )}
              <div style={{ display: "flex", gap: "8px" }}>
                <button 
                  type="button" 
                  style={{ flex: 1, height: "38px", background: "var(--bg-card)", border: "1px solid var(--border-color)", color: "var(--text-main)", borderRadius: "8px", cursor: "pointer", fontSize: "12px", fontWeight: 600 }}
                  onClick={() => {
                    if (isListening) stopListening();
                    else startListening();
                  }}
                >
                  {isListening ? "Pause Listening" : "Start Listening"}
                </button>
                <button 
                  type="submit" 
                  className="primary-button" 
                  style={{ padding: "0 24px" }}
                >
                  Next
                </button>
              </div>
            </form>
          </div>
        )}

        {step === "CONFIRM" && (
          <div style={{ margin: "16px 0", textAlign: "left" }}>
            <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "16px", textAlign: "center" }}>
              Please review the collected metadata. You can click any input box to edit details manually.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px", background: "var(--bg-card-hover)", padding: "16px", borderRadius: "12px", border: "1px solid var(--border-color)" }}>
              <label style={{ fontSize: "12px", display: "flex", flexDirection: "column", gap: "4px" }}>
                Client Name
                <input 
                  type="text" 
                  value={clientData.name} 
                  onChange={(e) => setClientData({ ...clientData, name: e.target.value })}
                  style={{ width: "100%", padding: "8px", background: "var(--bg-input)", border: "1px solid var(--border-color)", borderRadius: "6px", color: "var(--text-main)", fontSize: "12px", outline: 0 }}
                />
              </label>
              <label style={{ fontSize: "12px", display: "flex", flexDirection: "column", gap: "4px" }}>
                Company Name
                <input 
                  type="text" 
                  value={clientData.company} 
                  onChange={(e) => setClientData({ ...clientData, company: e.target.value })}
                  style={{ width: "100%", padding: "8px", background: "var(--bg-input)", border: "1px solid var(--border-color)", borderRadius: "6px", color: "var(--text-main)", fontSize: "12px", outline: 0 }}
                />
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <label style={{ fontSize: "12px", display: "flex", flexDirection: "column", gap: "4px" }}>
                  Contract Value (₹)
                  <input 
                    type="number" 
                    value={clientData.dealAmount} 
                    onChange={(e) => setClientData({ ...clientData, dealAmount: parseInt(e.target.value, 10) || 0 })}
                    style={{ width: "100%", padding: "8px", background: "var(--bg-input)", border: "1px solid var(--border-color)", borderRadius: "6px", color: "var(--text-main)", fontSize: "12px", outline: 0 }}
                  />
                </label>
                <label style={{ fontSize: "12px", display: "flex", flexDirection: "column", gap: "4px" }}>
                  Payment Phases
                  <input 
                    type="number" 
                    value={clientData.paymentSteps} 
                    onChange={(e) => setClientData({ ...clientData, paymentSteps: parseInt(e.target.value, 10) || 1 })}
                    style={{ width: "100%", padding: "8px", background: "var(--bg-input)", border: "1px solid var(--border-color)", borderRadius: "6px", color: "var(--text-main)", fontSize: "12px", outline: 0 }}
                  />
                </label>
              </div>
              <label style={{ fontSize: "12px", display: "flex", flexDirection: "column", gap: "4px" }}>
                Next Action
                <input 
                  type="text" 
                  value={clientData.nextAction} 
                  onChange={(e) => setClientData({ ...clientData, nextAction: e.target.value })}
                  style={{ width: "100%", padding: "8px", background: "var(--bg-input)", border: "1px solid var(--border-color)", borderRadius: "6px", color: "var(--text-main)", fontSize: "12px", outline: 0 }}
                />
              </label>
              <label style={{ fontSize: "12px", display: "flex", flexDirection: "column", gap: "4px" }}>
                Due Schedule
                <input 
                  type="text" 
                  value={clientData.due} 
                  onChange={(e) => setClientData({ ...clientData, due: e.target.value })}
                  style={{ width: "100%", padding: "8px", background: "var(--bg-input)", border: "1px solid var(--border-color)", borderRadius: "6px", color: "var(--text-main)", fontSize: "12px", outline: 0 }}
                />
              </label>
            </div>

            <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
              <button 
                type="button" 
                style={{ flex: 1, height: "38px", background: "var(--bg-card)", border: "1px solid var(--border-color)", color: "var(--text-main)", borderRadius: "8px", cursor: "pointer", fontSize: "12px", fontWeight: 600 }}
                onClick={() => setStep("ASK_NAME")}
              >
                Reset Flow
              </button>
              <button 
                type="button" 
                className="primary-button" 
                style={{ flex: 1 }}
                onClick={handleSave}
              >
                Save Client
              </button>
            </div>
          </div>
        )}

        {step === "COMPLETED" && (
          <div style={{ margin: "32px 0" }}>
            <span style={{ fontSize: "40px", display: "block", marginBottom: "16px" }}>🎉</span>
            <strong style={{ color: "var(--emerald)", fontSize: "16px", display: "block" }}>Onboarding Successful!</strong>
            <p style={{ color: "var(--text-muted)", fontSize: "12px", marginTop: "6px" }}>
              Saving to Supabase and closing...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Voice Smart Scheduler Modal Component
function VoiceSchedulerModal({
  onClose,
  onSubmit,
  clients,
  geminiApiKey,
  addToast,
}: {
  onClose: () => void;
  onSubmit: (tasks: any[], meetings: any[]) => Promise<void>;
  clients: Client[];
  geminiApiKey: string;
  addToast: (msg: string, type?: Toast["type"]) => void;
}) {
  const [agendaText, setAgendaText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedItems, setParsedItems] = useState<any[]>([]);
  
  const [audioLevels, setAudioLevels] = useState<number[]>([4, 4, 4, 4, 4]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  
  const recognitionRef = useRef<any>(null);

  const startVolumeTracking = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;
      
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const audioContext = new AudioCtx();
        audioContextRef.current = audioContext;
        
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 32;
        source.connect(analyser);
        
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        
        const updateVolume = () => {
          if (!analyser) return;
          analyser.getByteFrequencyData(dataArray);
          
          let total = 0;
          for (let i = 0; i < bufferLength; i++) {
            total += dataArray[i];
          }
          const average = total / bufferLength;
          
          const mappedLevels = [
            Math.max(4, Math.min(30, average * 0.3)),
            Math.max(4, Math.min(30, average * 0.6)),
            Math.max(4, Math.min(30, average * 0.8)),
            Math.max(4, Math.min(30, average * 0.5)),
            Math.max(4, Math.min(30, average * 0.2)),
          ];
          
          setAudioLevels(mappedLevels);
          animationFrameIdRef.current = requestAnimationFrame(updateVolume);
        };
        
        updateVolume();
      }
    } catch (err) {
      console.warn("Failed to track audio volume levels:", err);
    }
  };

  const stopVolumeTracking = useCallback(() => {
    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => track.stop());
      audioStreamRef.current = null;
    }
    setAudioLevels([4, 4, 4, 4, 4]);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const RecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (RecognitionClass) {
        const rec = new RecognitionClass();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = "en-US";

        rec.onresult = (e: any) => {
          let interimText = "";
          for (let i = e.resultIndex; i < e.results.length; ++i) {
            if (e.results[i].isFinal) {
              const finalVal = e.results[i][0].transcript.trim();
              setAgendaText((prev) => (prev ? prev + " " + finalVal : finalVal));
            } else {
              interimText += e.results[i][0].transcript;
              setAgendaText(interimText);
            }
          }
        };

        rec.onend = () => {
          setIsListening(false);
          stopVolumeTracking();
        };

        recognitionRef.current = rec;
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      stopVolumeTracking();
    };
  }, [stopVolumeTracking]);

  const startListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
        setIsListening(true);
        startVolumeTracking();
      } catch (err) {
        console.warn("Recognition already started:", err);
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      stopVolumeTracking();
    }
  };

  const handleProcess = async () => {
    stopListening();
    if (!agendaText.trim()) {
      addToast("Please speak or type your agenda first!", "warning");
      return;
    }

    setIsProcessing(true);
    try {
      const result = await parseAgendaWithGemini(geminiApiKey, agendaText, clients);
      if (result && Array.isArray(result.tasks)) {
        setParsedItems(result.tasks);
        addToast(`AI successfully parsed ${result.tasks.length} actions!`, "success");
      } else {
        addToast("AI parsed agenda but returned no tasks.", "info");
      }
    } catch (err: any) {
      console.error(err);
      addToast(`AI Processing failed: ${err.message || err}`, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveAll = async () => {
    const tasksToInsert: any[] = [];
    const meetingsToUpdate: any[] = [];

    parsedItems.forEach((item) => {
      const matchedClient = clients.find(
        (c) => c.name.toLowerCase().includes(item.clientName.toLowerCase()) || 
               item.clientName.toLowerCase().includes(c.name.toLowerCase())
      );

      if (item.type === "task") {
        tasksToInsert.push({
          title: item.title,
          clientId: matchedClient ? matchedClient.id : null,
          priority: "medium",
          due: item.due,
          done: false
        });
      } else if (item.type === "meeting") {
        const formattedDate = getFormattedDueDate(item.due, item.time);
        meetingsToUpdate.push({
          clientId: matchedClient ? matchedClient.id : null,
          clientName: item.clientName,
          title: item.title,
          due: formattedDate
        });
      }
    });

    try {
      await onSubmit(tasksToInsert, meetingsToUpdate);
      addToast(`Successfully scheduled ${parsedItems.length} actions!`, "success");
      onClose();
    } catch (err) {
      console.error(err);
      addToast("Failed to schedule parsed actions in database.", "error");
    }
  };

  const RecognitionClass = typeof window !== "undefined" && ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  return (
    <div className="overlay modal-wrap" role="dialog" aria-modal="true" aria-label="Smart Voice Scheduler">
      <div className="modal" style={{ width: "min(520px, 100%)" }}>
        <button 
          type="button" 
          className="close" 
          onClick={() => {
            stopListening();
            onClose();
          }} 
          aria-label="Close voice scheduler"
        >
          <XMarkIcon />
        </button>

        <span className="modal-icon" style={{ background: "linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(14, 165, 233, 0.1))", color: "var(--purple)", margin: "0 auto 16px" }}>
          🎙️
        </span>
        <h2 style={{ textAlign: "center" }}>Smart Voice Scheduler</h2>
        <p style={{ color: "var(--text-muted)", fontSize: "12px", marginBottom: "16px", textAlign: "center" }}>
          Speak or type your agenda, and AI will parse & link meetings and tasks automatically.
        </p>

        {!RecognitionClass && (
          <div style={{ background: "rgba(244, 63, 94, 0.08)", border: "1px solid rgba(244,63,94,0.15)", borderRadius: "8px", padding: "10px", fontSize: "11px", color: "var(--rose)", marginBottom: "16px" }}>
            ⚠️ Web Speech API is not supported in this browser. You can type conversational sentences below.
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <textarea
            value={agendaText}
            onChange={(e) => setAgendaText(e.target.value)}
            placeholder={isListening ? "Listening... Speak your tasks or meetings..." : "Speak or type agenda (e.g. Tomorrow at 11 AM meet with Santosh Pawar to review design, and send invoice to Deepak)"}
            style={{ width: "100%", height: "100px", padding: "12px", borderRadius: "8px", background: "var(--bg-input)", border: "1px solid var(--border-color)", color: "var(--text-main)", fontSize: "13px", resize: "none", outline: 0 }}
          />

          {/* Audio Equalizer bars visualizer */}
          <div style={{ display: "flex", justifyContent: "center", gap: "6px", height: "30px", alignItems: "center", margin: "4px 0" }}>
            {audioLevels.map((level, i) => (
              <span 
                key={i} 
                style={{ 
                  width: "4px", 
                  height: `${level}px`, 
                  background: "var(--purple)", 
                  borderRadius: "2px", 
                  transition: "height 0.08s ease"
                }} 
              />
            ))}
          </div>

          <div style={{ display: "flex", gap: "8px" }}>
            <button 
              type="button" 
              style={{ flex: 1, height: "38px", background: "var(--bg-card)", border: "1px solid var(--border-color)", color: "var(--text-main)", borderRadius: "8px", cursor: "pointer", fontSize: "12px", fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
              className={isListening ? "danger" : ""}
              onClick={() => {
                if (isListening) stopListening();
                else startListening();
              }}
            >
              {isListening ? (
                <>
                  <span className="spinner-dot" style={{ width: 8, height: 8, background: "currentColor", borderRadius: "50%", animation: "pulseGlow 0.6s infinite alternate" }} />
                  Pause Listening
                </>
              ) : (
                "Start Listening"
              )}
            </button>
            <button 
              type="button" 
              className="primary-button" 
              style={{ flex: 1 }}
              onClick={handleProcess}
              disabled={isProcessing || !agendaText}
            >
              {isProcessing ? "AI Parsing..." : "Process with AI"}
            </button>
          </div>
        </div>

        {isProcessing && (
          <div style={{ textAlign: "center", margin: "24px 0" }}>
            <span style={{ display: "inline-block", width: "24px", height: "24px", border: "3px solid var(--purple-soft)", borderTopColor: "var(--purple)", borderRadius: "50%", animation: "spin 1s linear infinite", marginBottom: "8px" }} />
            <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>Gemini is structuring your tasks...</p>
          </div>
        )}

        {!isProcessing && parsedItems.length > 0 && (
          <div style={{ marginTop: "24px", textAlign: "left" }}>
            <h3 style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-light)", marginBottom: "12px" }}>
              Extracted Actions Preview
            </h3>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "200px", overflowY: "auto", paddingRight: "4px" }}>
              {parsedItems.map((item, i) => {
                const matched = clients.find(
                  (c) => c.name.toLowerCase().includes(item.clientName.toLowerCase()) || 
                         item.clientName.toLowerCase().includes(c.name.toLowerCase())
                );
                
                return (
                  <div key={i} style={{ padding: "10px 12px", background: "var(--bg-card-hover)", borderRadius: "8px", border: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <strong style={{ fontSize: "13px", display: "block", color: "var(--text-main)" }}>{item.title}</strong>
                      <small style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                        {item.type === "meeting" ? "📅 Meeting" : "📋 Task"} • {item.due} {item.time ? `at ${item.time}` : ""}
                      </small>
                    </div>
                    <span style={{ fontSize: "10px", fontWeight: 700, padding: "4px 8px", borderRadius: "6px", background: matched ? "var(--purple-soft)" : "rgba(100,116,139,0.08)", color: matched ? "var(--purple)" : "var(--text-muted)" }}>
                      {matched ? matched.name : "General"}
                    </span>
                  </div>
                );
              })}
            </div>

            <button 
              type="button" 
              className="primary-button" 
              style={{ width: "100%", marginTop: "16px", padding: "12px" }}
              onClick={handleSaveAll}
            >
              Confirm and Schedule All
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Profile edit form dialog modal sub-component
function ProfileModal({
  adminName,
  adminRole,
  adminInitials,
  adminAvatar,
  onClose,
  onSave,
}: {
  adminName: string;
  adminRole: string;
  adminInitials: string;
  adminAvatar: string;
  onClose: () => void;
  onSave: (name: string, role: string, initials: string, avatarUrl: string) => void;
}) {
  const [avatarBase64, setAvatarBase64] = useState(adminAvatar);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarBase64(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="overlay modal-wrap" role="dialog" aria-modal="true" aria-label="Administrator profile">
      <form
        className="modal"
        onSubmit={(e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const name = (form.elements.namedItem("name") as HTMLInputElement).value.trim();
          const role = (form.elements.namedItem("role") as HTMLInputElement).value.trim();
          const initials = (form.elements.namedItem("initials") as HTMLInputElement).value.trim();
          onSave(name, role, initials, avatarBase64);
        }}
      >
        <button type="button" className="close" onClick={onClose} aria-label="Close form">
          <XMarkIcon />
        </button>

        <span className="modal-icon" style={{ background: "rgba(139, 92, 246, 0.1)", color: "var(--purple)" }}>
          <UserIcon style={{ width: 24, height: 24 }} />
        </span>
        <h2>Administrator Profile</h2>
        <p>Edit details and upload a profile picture for your main administrator account.</p>

        {/* Profile Picture Uploader */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px", margin: "16px 0", padding: "12px", border: "1px solid var(--border-color)", borderRadius: "8px", background: "var(--bg-card)" }}>
          {avatarBase64 ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img 
              src={avatarBase64} 
              alt="Preview" 
              style={{ width: "48px", height: "48px", borderRadius: "50%", objectFit: "cover", border: "2px solid var(--purple)" }} 
            />
          ) : (
            <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "var(--bg-card-hover)", display: "flex", alignItems: "center", justifyContent: "center", border: "1px dashed var(--border-color)", fontSize: "16px", fontWeight: 700, color: "var(--text-muted)" }}>
              {adminInitials || "A"}
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--purple)", cursor: "pointer", border: "1px solid var(--purple)", borderRadius: "4px", padding: "4px 8px", background: "transparent", display: "inline-block", width: "max-content" }}>
              Upload Picture
              <input type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: "none" }} />
            </label>
            {avatarBase64 && (
              <button 
                type="button" 
                onClick={() => setAvatarBase64("")} 
                style={{ fontSize: "10px", color: "var(--red)", background: "none", border: 0, padding: 0, cursor: "pointer", textAlign: "left" }}
              >
                Remove Picture
              </button>
            )}
          </div>
        </div>

        <div className="modal-grid-2">
          <label>
            Full Name *
            <input name="name" required defaultValue={adminName} placeholder="e.g. Aarya Rao" autoFocus />
          </label>
          <label>
            Role Title *
            <input name="role" required defaultValue={adminRole} placeholder="e.g. Administrator" />
          </label>
        </div>

        <label style={{ display: "block", marginTop: "12px" }}>
          Avatar Initials (1-2 chars) *
          <input name="initials" required maxLength={2} defaultValue={adminInitials} placeholder="e.g. AR" style={{ textTransform: "uppercase" }} />
        </label>

        <div className="modal-actions" style={{ marginTop: "20px" }}>
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="primary-button" type="submit">
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
}

// Settings dialog modal sub-component
function SettingsModal({
  currentWorkspace,
  onClose,
  onSaveWorkspace,
  theme,
  setTheme,
  geminiApiKey,
}: {
  currentWorkspace: string;
  onClose: () => void;
  onSaveWorkspace: (workspace: string, geminiKey: string) => void;
  theme: "light" | "dark";
  setTheme: (theme: "light" | "dark") => void;
  geminiApiKey: string;
}) {
  return (
    <div className="overlay modal-wrap" role="dialog" aria-modal="true" aria-label="System Settings">
      <form
        className="modal"
        onSubmit={(e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const ws = (form.elements.namedItem("workspace") as HTMLInputElement).value.trim();
          const gKey = (form.elements.namedItem("geminiKey") as HTMLInputElement).value.trim();
          onSaveWorkspace(ws, gKey);
          onClose();
        }}
      >
        <button type="button" className="close" onClick={onClose} aria-label="Close form">
          <XMarkIcon />
        </button>

        <span className="modal-icon" style={{ background: "rgba(59, 130, 246, 0.1)", color: "var(--blue)" }}>
          <Cog6ToothIcon style={{ width: 24, height: 24 }} />
        </span>
        <h2>System Settings</h2>
        <p>Manage workspace details, theme configuration, and connection status.</p>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "16px" }}>
          <label>
            Workspace Name *
            <input name="workspace" required defaultValue={currentWorkspace} placeholder="e.g. My Workspace" autoFocus />
          </label>

          <label>
            Gemini API Key (for Voice AI features)
            <input 
              name="geminiKey" 
              type="password" 
              defaultValue={geminiApiKey} 
              placeholder="Enter Gemini API key" 
              style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--bg-input)", color: "var(--text-main)" }}
            />
          </label>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid var(--border-color)", padding: "12px", borderRadius: "8px", background: "var(--bg-card)" }}>
            <div>
              <strong style={{ display: "block", fontSize: "13px", color: "var(--text-main)" }}>Dark Mode</strong>
              <small style={{ color: "var(--text-muted)", fontSize: "11px" }}>Switch between light and dark visual themes</small>
            </div>
            <button 
              type="button"
              className={`meet-button ${theme === "dark" ? "" : "ghost"}`}
              style={{ height: "auto", padding: "6px 12px", fontSize: "11px" }}
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            >
              {theme === "light" ? "Enable" : "Disable"}
            </button>
          </div>

          <div style={{ border: "1px solid var(--border-color)", padding: "12px", borderRadius: "8px", background: "var(--bg-card)" }}>
            <strong style={{ display: "block", fontSize: "13px", color: "var(--text-main)", marginBottom: "4px" }}>Database Connection</strong>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "var(--green)" }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "currentColor" }} />
              Supabase connected successfully
            </div>
            <code style={{ display: "block", fontSize: "10px", color: "var(--text-muted)", marginTop: "6px", background: "var(--bg-card-hover)", padding: "6px", borderRadius: "4px" }}>
              URL: https://elirzkmzadgbjplomkgv.supabase.co
            </code>
          </div>
        </div>

        <div className="modal-actions" style={{ marginTop: "20px" }}>
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="primary-button" type="submit">
            Save Settings
          </button>
        </div>
      </form>
    </div>
  );
}

// LockScreen Welcome Session modal sub-component
function LockScreen({
  adminName,
  adminInitials,
  adminAvatar,
  onUnlock,
}: {
  adminName: string;
  adminInitials: string;
  adminAvatar: string;
  onUnlock: () => void;
}) {
  const [unlockVal, setUnlockVal] = useState(adminName);

  return (
    <div 
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "radial-gradient(circle at top left, var(--bg-card), var(--bg-main))",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px"
      }}
    >
      <div 
        style={{
          width: "100%",
          maxWidth: "400px",
          background: "var(--bg-card)",
          border: "1px solid var(--border-color)",
          borderRadius: "16px",
          padding: "32px",
          boxShadow: "0 20px 40px rgba(0, 0, 0, 0.15)",
          textAlign: "center",
          backdropFilter: "blur(20px)"
        }}
      >
        {adminAvatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img 
            src={adminAvatar} 
            alt={adminName} 
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "50%",
              objectFit: "cover",
              margin: "0 auto 20px",
              border: "2px solid var(--purple)",
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)"
            }}
          />
        ) : (
          <div 
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, var(--purple), var(--blue))",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "24px",
              fontWeight: 700,
              margin: "0 auto 20px"
            }}
          >
            {adminInitials}
          </div>
        )}

        <h1 style={{ fontSize: "20px", fontWeight: 700, color: "var(--text-main)", marginBottom: "4px" }}>
          ClientOps Command Center
        </h1>
        <p style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "24px" }}>
          Enter administrator name to unlock session
        </p>

        <form 
          onSubmit={(e) => {
            e.preventDefault();
            if (unlockVal.trim().toLowerCase() === adminName.trim().toLowerCase()) {
              onUnlock();
            } else {
              alert("Incorrect Administrator Name!");
            }
          }}
          style={{ display: "flex", flexDirection: "column", gap: "16px" }}
        >
          <input 
            type="text" 
            value={unlockVal} 
            onChange={(e) => setUnlockVal(e.target.value)}
            placeholder="Administrator Name"
            required
            style={{
              width: "100%",
              padding: "12px 16px",
              background: "var(--bg-card-hover)",
              border: "1px solid var(--border-color)",
              borderRadius: "8px",
              color: "var(--text-main)",
              fontSize: "14px",
              textAlign: "center",
              outline: 0
            }}
          />

          <button 
            type="submit" 
            className="primary-button" 
            style={{
              width: "100%",
              padding: "12px",
              background: "var(--purple)",
              color: "#fff",
              border: 0,
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: 600,
              cursor: "pointer"
            }}
          >
            Unlock Command Center
          </button>
        </form>
      </div>
    </div>
  );
}

// Clients Directory page sub-component
function ClientsPage({
  clients,
  onOpen,
  stage,
  setStage,
}: {
  clients: Client[];
  onOpen: (client: Client) => void;
  stage: "All" | Stage;
  setStage: (stage: "All" | Stage) => void;
}) {
  const shown = clients.filter((client) => stage === "All" || client.stage === stage);

  return (
    <section className="page-panel animate-fade">
      <div className="page-toolbar">
        <div className="filter-pills">
          {(["All", "Closing", "Active work", "Delivery", "Proposal"] as const).map((item) => (
            <button
              key={item}
              className={stage === item ? "selected" : ""}
              onClick={() => setStage(item)}
            >
              {item}
            </button>
          ))}
        </div>
        <button className="filter-button" onClick={() => alert("Custom sorting & filter options menu.")}>
          <FunnelIcon /> Filters
        </button>
      </div>

      <div className="client-directory">
        {shown.map((client) => (
          <button className="directory-row" key={client.id} onClick={() => onOpen(client)}>
            <Avatar client={client} />
            <span className="directory-name">
              <strong>{client.company || "Independent"}</strong>
              <small>{client.name}</small>
            </span>
            <StageBadge stage={client.stage} />
            <span className="directory-next">
              <small>NEXT ACTION</small>
              <strong>{client.nextAction}</strong>
            </span>
            <span className={`health-label ${client.health}`}>
              <i />{" "}
              {client.health === "red"
                ? "At risk"
                : client.health === "amber"
                ? "Needs attention"
                : "On track"}
            </span>
            <span className="directory-due">{formatDueLabel(client.due)}</span>
            <ChevronRightIcon className="chevron" />
          </button>
        ))}
        {shown.length === 0 && <div className="empty">No clients in this stage.</div>}
      </div>
    </section>
  );
}

const priorityWeight = { high: 3, medium: 2, low: 1 };
const dueWeight = { Overdue: 5, Today: 4, Tomorrow: 3, Friday: 2, "This week": 1, Later: 0 };

// Upgraded Tasks Page sub-component
function TasksPage({
  tasks,
  clients,
  onToggle,
  onDelete,
  onAddTask,
  onStartVoiceScheduler,
}: {
  tasks: Task[];
  clients: Client[];
  onToggle: (id: number) => void;
  onDelete: (id: number) => void;
  onAddTask: (title: string, clientId: number | undefined, priority: Task["priority"], due: string) => void;
  onStartVoiceScheduler: () => void;
}) {
  const [view, setView] = useState<"All" | "Open" | "Completed">("All");
  const [clientFilter, setClientFilter] = useState<string>("All"); // "All" | "General" | clientId
  const [sortBy, setSortBy] = useState<"due" | "priority">("due");
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddModalOpen, setAddModalOpen] = useState(false);

  // Filter tasks logic
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchView = view === "All" || (view === "Open" ? !task.done : task.done);
      
      const matchClient =
        clientFilter === "All" ||
        (clientFilter === "General" && !task.clientId) ||
        (task.clientId && task.clientId.toString() === clientFilter);
        
      const matchSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase());
      
      return matchView && matchClient && matchSearch;
    });
  }, [tasks, view, clientFilter, searchQuery]);

  const sortedTasks = useMemo(() => {
    return [...filteredTasks].sort((a, b) => {
      if (sortBy === "priority") {
        return priorityWeight[b.priority] - priorityWeight[a.priority];
      } else {
        const weightA = dueWeight[a.due as keyof typeof dueWeight] !== undefined ? dueWeight[a.due as keyof typeof dueWeight] : -1;
        const weightB = dueWeight[b.due as keyof typeof dueWeight] !== undefined ? dueWeight[b.due as keyof typeof dueWeight] : -1;
        return weightB - weightA;
      }
    });
  }, [filteredTasks, sortBy]);

  return (
    <section className="page-panel tasks-page">
      <div className="page-toolbar" style={{ display: "flex", flexDirection: "column", gap: "14px", alignItems: "stretch" }}>
        {/* Row 1: View filters & Add Task button */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div className="filter-pills">
            {(["All", "Open", "Completed"] as const).map((item) => (
              <button key={item} className={view === item ? "selected" : ""} onClick={() => setView(item)}>
                {item}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button 
              type="button"
              className="primary-button" 
              style={{ background: "linear-gradient(135deg, var(--purple), var(--sky))", display: "inline-flex", gap: "6px" }}
              onClick={onStartVoiceScheduler}
            >
              🎙️ Smart Voice Schedule
            </button>
            <button className="primary-button" onClick={() => setAddModalOpen(true)}>
              <PlusIcon /> Add Task
            </button>
          </div>
        </div>

        {/* Row 2: Search, client filters, sorting */}
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
          <div className="search" style={{ flex: 1, width: "auto" }}>
            <MagnifyingGlassIcon />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tasks..."
            />
            {searchQuery && (
              <button className="clear-search-btn" onClick={() => setSearchQuery("")}>
                <XMarkIcon style={{ width: 14 }} />
              </button>
            )}
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
            Client
            <select
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
              style={{
                border: "1px solid var(--border-color)",
                borderRadius: "8px",
                padding: "6px 12px",
                background: "var(--bg-card)",
                color: "var(--text-main)",
                fontSize: "12px",
                fontWeight: 600,
                outline: 0
              }}
            >
              <option value="All">All Clients</option>
              <option value="General">General / Unlinked</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id.toString()}>{c.name}</option>
              ))}
            </select>
          </label>

          <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
            Sort
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "due" | "priority")}
              style={{
                border: "1px solid var(--border-color)",
                borderRadius: "8px",
                padding: "6px 12px",
                background: "var(--bg-card)",
                color: "var(--text-main)",
                fontSize: "12px",
                fontWeight: 600,
                outline: 0
              }}
            >
              <option value="due">Due Date</option>
              <option value="priority">Priority</option>
            </select>
          </label>
        </div>
      </div>

      <div className="full-task-list">
        {sortedTasks.map((task) => {
          const assocClient = clients.find((c) => c.id === task.clientId);
          return (
            <div className={`full-task ${task.done ? "done" : ""}`} key={task.id}>
              <label style={{ display: "flex", gap: "12px", flex: 1, alignItems: "center", cursor: "pointer" }}>
                <input type="checkbox" checked={task.done} onChange={() => onToggle(task.id)} />
                <span className="check">
                  <CheckCircleIcon />
                </span>
                <span>
                  <strong>{task.title}</strong>
                  <small>
                    {assocClient ? `Client: ${assocClient.name} (${assocClient.company})` : "General Task"}
                  </small>
                </span>
              </label>
              
              <div className="full-task-meta">
                <span className={`priority-badge ${task.priority}`}>{task.priority}</span>
                <em className={task.due === "Overdue" ? "red-text" : ""}>{task.due}</em>
                <button
                  className="task-delete-btn"
                  onClick={() => {
                    if (confirm("Are you sure you want to delete this task?")) {
                      onDelete(task.id);
                    }
                  }}
                  title="Delete Task"
                >
                  <TrashIcon style={{ width: 14 }} />
                </button>
              </div>
            </div>
          );
        })}
        {sortedTasks.length === 0 && <div className="empty">No tasks matching filters.</div>}
      </div>

      {isAddModalOpen && (
        <AddTaskModal
          clients={clients}
          onClose={() => setAddModalOpen(false)}
          onSubmit={(title, cId, priority, due) => {
            onAddTask(title, cId, priority, due);
            setAddModalOpen(false);
          }}
        />
      )}
    </section>
  );
}

// Helper to match tasks to specific calendar cell dates
function isTaskDueOnDate(task: Task, day: number, month: number, year: number, clients: Client[]): boolean {
  if (!task.due) return false;
  
  const linkedClient = task.clientId ? clients.find((c) => c.id === task.clientId) : null;
  const targetDateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  
  if (task.due.includes(targetDateStr)) return true;

  const systemDate = new Date();
  const cellDate = new Date(year, month, day);
  cellDate.setHours(0, 0, 0, 0);
  
  if (task.due.toLowerCase() === "today") {
    const today = new Date(systemDate);
    today.setHours(0, 0, 0, 0);
    return cellDate.getTime() === today.getTime();
  }
  if (task.due.toLowerCase() === "tomorrow") {
    const tomorrow = new Date(systemDate);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return cellDate.getTime() === tomorrow.getTime();
  }

  if (linkedClient && linkedClient.due.includes(targetDateStr)) {
    return true;
  }

  return false;
}

// Calendar View sub-component
function CalendarPage({
  onOpen,
  events,
  tasks,
  clients,
  onToggleTask,
}: {
  onOpen: (client: Client) => void;
  events: { day: number; month: number; year: number; time: string; title: string; client: Client }[];
  tasks: Task[];
  clients: Client[];
  onToggleTask: (taskId: number) => void;
}) {
  const [currentMonth, setCurrentMonth] = useState(6); // default to July (index 6)
  const [currentYear, setCurrentYear] = useState(2026);
  const [activeDate, setActiveDate] = useState<{ day: number; month: number; year: number } | null>(null);

  const monthName = new Date(currentYear, currentMonth).toLocaleString("default", { month: "long" });

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  // Get index day of first day (Monday-aligned, index 0 is Mon, 6 is Sun)
  const firstDayOfWeekIndex = (new Date(currentYear, currentMonth, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  // Create grid cells
  const gridCells = useMemo(() => {
    const cells = [];
    // Previous month offset days
    const prevMonthDays = new Date(currentYear, currentMonth, 0).getDate();
    for (let i = firstDayOfWeekIndex - 1; i >= 0; i--) {
      cells.push({ day: prevMonthDays - i, currentMonth: false });
    }
    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ day: d, currentMonth: true });
    }
    // Next month offset days to make a complete grid (multiple of 7)
    const trailingSlots = (7 - (cells.length % 7)) % 7;
    for (let n = 1; n <= trailingSlots; n++) {
      cells.push({ day: n, currentMonth: false });
    }
    return cells;
  }, [currentMonth, currentYear, firstDayOfWeekIndex, daysInMonth]);

  return (
    <section className="page-panel calendar-page">
      <div className="calendar-head">
        <div className="calendar-head-title">
          <strong>
            {monthName} {currentYear}
          </strong>
        </div>
        <div style={{ display: "flex", gap: "6px" }}>
          <button onClick={handlePrevMonth}>‹</button>
          <button onClick={handleNextMonth}>›</button>
        </div>
      </div>

      <div className="calendar-week">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>

      <div className="calendar-grid">
        {gridCells.map((cell, index) => {
          const dayEvents = cell.currentMonth
            ? events.filter((ev) => ev.day === cell.day && ev.month === currentMonth && ev.year === currentYear)
            : [];

          const systemDate = new Date();
          const isToday = cell.currentMonth &&
            cell.day === systemDate.getDate() &&
            currentMonth === systemDate.getMonth() &&
            currentYear === systemDate.getFullYear();

          return (
            <div
              className={`calendar-day ${isToday ? "today" : ""} ${!cell.currentMonth ? "offset-day" : ""}`}
              style={{ opacity: cell.currentMonth ? 1 : 0.4, cursor: cell.currentMonth ? "pointer" : "default" }}
              key={index}
              onClick={() => {
                if (cell.currentMonth) {
                  setActiveDate({ day: cell.day, month: currentMonth, year: currentYear });
                }
              }}
            >
              <b>{cell.day}</b>
              {dayEvents.map((event) => (
                <button 
                  key={event.title} 
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpen(event.client);
                  }}
                >
                  <span>{event.time}</span>
                  {event.client.name}
                </button>
              ))}
            </div>
          );
        })}
      </div>

      <div className="agenda">
        <h2>Upcoming agenda</h2>
        {events
          .filter((e) => {
            const evDate = new Date(e.year, e.month, e.day);
            const todayDate = new Date();
            todayDate.setHours(0, 0, 0, 0);
            return evDate >= todayDate;
          })
          .sort((a, b) => new Date(a.year, a.month, a.day).getTime() - new Date(b.year, b.month, b.day).getTime())
          .map((event) => (
            <button key={`${event.day}-${event.title}`} onClick={() => onOpen(event.client)}>
              <b>{new Date(event.year, event.month, event.day).toLocaleDateString("default", { month: "short", day: "numeric" })}</b>
              <span>
                {event.time} · {event.title}
                <small>Client: {event.client.name}</small>
              </span>
              <ChevronRightIcon className="chevron" />
            </button>
          ))}
      </div>

      {activeDate && (
        <div className="overlay modal-wrap" role="dialog" aria-modal="true" onClick={() => setActiveDate(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "480px" }}>
            <div className="modal-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-color)", paddingBottom: "12px" }}>
              <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 700 }}>
                Schedule for {new Date(activeDate.year, activeDate.month, activeDate.day).toLocaleDateString("default", { month: "short", day: "numeric", year: "numeric" })}
              </h2>
              <button 
                className="close-btn" 
                onClick={() => setActiveDate(null)} 
                aria-label="Close modal"
                style={{ background: "none", border: 0, cursor: "pointer", color: "var(--text-muted)", display: "flex", padding: "4px" }}
              >
                <XMarkIcon style={{ width: 18, height: 18 }} />
              </button>
            </div>

            <div className="modal-content" style={{ display: "flex", flexDirection: "column", gap: "20px", marginTop: "16px" }}>
              {/* Section 1: Client Follow-ups */}
              <div>
                <h3 style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "10px", marginTop: 0 }}>
                  Client Milestones
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {events
                    .filter((ev) => ev.day === activeDate.day && ev.month === activeDate.month && ev.year === activeDate.year)
                    .map((ev, i) => (
                      <div 
                        key={i} 
                        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px", background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "8px" }}
                      >
                        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                          <span style={{ fontSize: "11px", fontWeight: 700, padding: "4px 8px", background: "var(--bg-card-hover)", color: "var(--purple)", borderRadius: "4px", border: "1px solid var(--border-color)" }}>
                            {ev.time}
                          </span>
                          <div>
                            <strong style={{ fontSize: "13px", color: "var(--text-main)", display: "block" }}>{ev.title}</strong>
                            <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>{ev.client.company || "Independent"} · {ev.client.name}</span>
                          </div>
                        </div>
                        <button 
                          className="meet-button ghost" 
                          style={{ padding: "6px 12px", fontSize: "11px", height: "auto" }}
                          onClick={() => {
                            onOpen(ev.client);
                            setActiveDate(null);
                          }}
                        >
                          Details
                        </button>
                      </div>
                    ))}
                  {events.filter((ev) => ev.day === activeDate.day && ev.month === activeDate.month && ev.year === activeDate.year).length === 0 && (
                    <p style={{ fontSize: "12px", color: "var(--text-muted)", fontStyle: "italic", padding: "4px 0", margin: 0 }}>No client deadlines scheduled.</p>
                  )}
                </div>
              </div>

              {/* Section 2: Tasks Due */}
              <div>
                <h3 style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "10px", marginTop: 0 }}>
                  Tasks Scheduled
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {tasks
                    .filter((task) => isTaskDueOnDate(task, activeDate.day, activeDate.month, activeDate.year, clients))
                    .map((task) => {
                      const assocClient = task.clientId ? clients.find((c) => c.id === task.clientId) : null;
                      return (
                        <div 
                          key={task.id} 
                          className="full-task-card"
                          style={{ padding: "10px 12px", background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "space-between" }}
                        >
                          <label style={{ display: "flex", gap: "10px", alignItems: "center", cursor: "pointer", flex: 1, margin: 0 }}>
                            <input 
                              type="checkbox" 
                              checked={task.done} 
                              onChange={() => onToggleTask(task.id)}
                              style={{ width: "16px", height: "16px", borderRadius: "4px", accentColor: "var(--purple)", margin: 0 }}
                            />
                            <span style={{ textDecoration: task.done ? "line-through" : "none", color: task.done ? "var(--text-muted)" : "var(--text-main)", display: "block" }}>
                              <strong style={{ fontSize: "13px", display: "block" }}>{task.title}</strong>
                              <small style={{ fontSize: "11px", color: "var(--text-muted)", display: "block" }}>
                                {assocClient ? `Client: ${assocClient.name}` : "General Task"}
                              </small>
                            </span>
                          </label>
                          <span className={`priority-badge ${task.priority}`} style={{ padding: "2px 6px", fontSize: "10px", margin: 0 }}>{task.priority}</span>
                        </div>
                      );
                    })}
                  {tasks.filter((task) => isTaskDueOnDate(task, activeDate.day, activeDate.month, activeDate.year, clients)).length === 0 && (
                    <p style={{ fontSize: "12px", color: "var(--text-muted)", fontStyle: "italic", padding: "4px 0", margin: 0 }}>No general tasks due.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
