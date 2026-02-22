import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";
import multer from "multer";
import fs from "fs";
import * as msal from "@azure/msal-node";
import { Client } from "@microsoft/microsoft-graph-client";
import "isomorphic-fetch";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("renovaflow.db");

// SharePoint Integration
const msalConfig = {
  auth: {
    clientId: process.env.MICROSOFT_CLIENT_ID || "",
    authority: `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID || "common"}`,
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET || "",
  },
};

const cca = new msal.ConfidentialClientApplication(msalConfig);

async function getAccessToken() {
  if (
    !process.env.MICROSOFT_CLIENT_ID || 
    !process.env.MICROSOFT_CLIENT_SECRET || 
    !process.env.MICROSOFT_TENANT_ID ||
    !process.env.SHAREPOINT_SITE_ID ||
    !process.env.SHAREPOINT_DRIVE_ID
  ) {
    return null;
  }
  try {
    const tokenRequest = {
      scopes: ["https://graph.microsoft.com/.default"],
    };
    const response = await cca.acquireTokenByClientCredential(tokenRequest);
    return response?.accessToken;
  } catch (e) {
    console.error("MSAL Token Error:", e);
    return null;
  }
}

async function getGraphClient() {
  const token = await getAccessToken();
  if (!token) return null;
  return Client.init({
    authProvider: (done) => done(null, token),
  });
}

async function createSharePointFolder(folderName: string) {
  const client = await getGraphClient();
  if (!client) {
    console.error("SharePoint API: Failed to get Graph Client. Check MICROSOFT_* environment variables.");
    return null;
  }

  const siteId = process.env.SHAREPOINT_SITE_ID;
  const driveId = process.env.SHAREPOINT_DRIVE_ID;
  const basePath = process.env.SHAREPOINT_BASE_PATH || "本社共有（Re-iDea)/04.リフォーム/Renova";
  const sanitizedFolderName = folderName.replace(/[\\\/:*?"<>|]/g, '_');
  const fullPath = `${basePath}/${sanitizedFolderName}`;

  console.log(`SharePoint API: Attempting to create folder at path: ${fullPath}`);

  try {
    const result = await client.api(`/sites/${siteId}/drives/${driveId}/root:/${fullPath}:`)
      .patch({
        name: sanitizedFolderName,
        folder: {},
        "@microsoft.graph.conflictBehavior": "replace"
      });
    console.log(`SharePoint API: Successfully created/verified folder: ${sanitizedFolderName}`);
    return result;
  } catch (e) {
    console.error(`SharePoint API: Folder Creation Error for path [${fullPath}]:`, e);
    return null;
  }
}

async function uploadFileToSharePoint(folderName: string, fileName: string, fileBuffer: Buffer) {
  const client = await getGraphClient();
  if (!client) {
    console.error("SharePoint API: Failed to get Graph Client for upload.");
    return null;
  }

  const siteId = process.env.SHAREPOINT_SITE_ID;
  const driveId = process.env.SHAREPOINT_DRIVE_ID;
  const basePath = process.env.SHAREPOINT_BASE_PATH || "本社共有（Re-iDea)/04.リフォーム/Renova";
  const sanitizedFolderName = folderName.replace(/[\\\/:*?"<>|]/g, '_');
  const fullPath = `${basePath}/${sanitizedFolderName}/${fileName}`;

  console.log(`SharePoint API: Attempting to upload file to: ${fullPath}`);

  try {
    const result = await client.api(`/sites/${siteId}/drives/${driveId}/root:/${fullPath}:/content`)
      .put(fileBuffer);
    console.log(`SharePoint API: Successfully uploaded file: ${fileName}`);
    return result;
  } catch (e) {
    console.error(`SharePoint API: Upload Error for file [${fullPath}]:`, e);
    return null;
  }
}

async function backupDatabaseToSharePoint() {
  const client = await getGraphClient();
  if (!client) return;

  const siteId = process.env.SHAREPOINT_SITE_ID;
  const driveId = process.env.SHAREPOINT_DRIVE_ID;
  const basePath = process.env.SHAREPOINT_BASE_PATH || "本社共有（Re-iDea)/04.リフォーム/Renova";
  const dbPath = path.join(__dirname, "renovaflow.db");

  if (!fs.existsSync(dbPath)) return;

  try {
    const fileBuffer = fs.readFileSync(dbPath);
    await client.api(`/sites/${siteId}/drives/${driveId}/root:/${basePath}/renovaflow.db:/content`)
      .put(fileBuffer);
    console.log("Database backed up to SharePoint");
  } catch (e) {
    console.error("Database Backup Error:", e);
  }
}

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE,
    password TEXT,
    name TEXT,
    role TEXT,
    remarks TEXT,
    isActive INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    status TEXT,
    estimateDate TEXT,
    orderDate TEXT,
    constructionStartDate TEXT,
    completionDate TEXT,
    paymentDate TEXT,
    title TEXT,
    propertyName TEXT,
    estimateRemarks TEXT,
    orderRemarks TEXT,
    paymentMethod TEXT,
    paymentRemarks TEXT,
    constructionRemarks TEXT,
    billingRemarks TEXT,
    outboundPaymentRemarks TEXT,
    customerName TEXT,
    customerZipCode TEXT,
    customerAddress TEXT,
    customerTel TEXT,
    customerEmail TEXT
  );

  CREATE TABLE IF NOT EXISTS construction_staff (
    id TEXT PRIMARY KEY,
    projectId TEXT,
    name TEXT,
    zipCode TEXT,
    address TEXT,
    tel TEXT,
    email TEXT,
    FOREIGN KEY(projectId) REFERENCES projects(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS billing_items (
    id TEXT PRIMARY KEY,
    projectId TEXT,
    name TEXT,
    amount INTEGER,
    expectedPaymentDate TEXT,
    isBilled INTEGER DEFAULT 0,
    isPaid INTEGER DEFAULT 0,
    FOREIGN KEY(projectId) REFERENCES projects(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS outbound_payments (
    id TEXT PRIMARY KEY,
    projectId TEXT,
    recipient TEXT,
    amount INTEGER,
    expectedDate TEXT,
    isPaid INTEGER DEFAULT 0,
    FOREIGN KEY(projectId) REFERENCES projects(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS files (
    id TEXT PRIMARY KEY,
    projectId TEXT,
    name TEXT,
    url TEXT,
    FOREIGN KEY(projectId) REFERENCES projects(id) ON DELETE CASCADE
  );
`);

// Migrations for new columns
const migrateColumns = [
  { table: 'projects', column: 'orderDate', type: 'TEXT' },
  { table: 'projects', column: 'constructionStartDate', type: 'TEXT' },
  { table: 'projects', column: 'paymentDate', type: 'TEXT' },
  { table: 'projects', column: 'paymentMethod', type: 'TEXT' },
  { table: 'projects', column: 'paymentRemarks', type: 'TEXT' },
  { table: 'projects', column: 'constructionRemarks', type: 'TEXT' },
  { table: 'projects', column: 'billingRemarks', type: 'TEXT' },
  { table: 'projects', column: 'outboundPaymentRemarks', type: 'TEXT' },
  { table: 'users', column: 'remarks', type: 'TEXT' },
  { table: 'users', column: 'isActive', type: 'INTEGER DEFAULT 1' },
  { table: 'projects', column: 'propertyName', type: 'TEXT' }
];

for (const m of migrateColumns) {
  try {
    db.prepare(`ALTER TABLE ${m.table} ADD COLUMN ${m.column} ${m.type}`).run();
  } catch (e) {
    // Column might already exist
  }
}

// Seed initial user if not exists
const seedUser = db.prepare("SELECT * FROM users WHERE email = ?").get("admin@example.com");
if (!seedUser) {
  db.prepare("INSERT INTO users (id, email, password, name, role) VALUES (?, ?, ?, ?, ?)").run(
    "1",
    "admin@example.com",
    "password123",
    "管理者",
    "admin"
  );
}

const app = express();
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/upload", express.static(path.join(__dirname, "uploads")));

// File Upload Setup
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const originalname = Buffer.from(file.originalname, 'latin1').toString('utf8');
    cb(null, `${Date.now()}-${originalname}`);
  },
});
const upload = multer({ storage });

// API Routes
app.post("/api/login", (req, res) => {
  const { email, password } = req.body;
  console.log(`Login attempt for: ${email}`);
  const user = db.prepare("SELECT * FROM users WHERE email = ? AND password = ?").get(email, password);
  if (user) {
    if (user.isActive === 0) {
      console.log(`Login failed: Account deactivated for ${email}`);
      return res.status(403).json({ error: "Account is deactivated" });
    }
    console.log(`Login successful for: ${email}`);
    res.json({ id: user.id, email: user.email, name: user.name, role: user.role });
  } else {
    console.log(`Login failed: Invalid credentials for ${email}`);
    res.status(401).json({ error: "Invalid credentials" });
  }
});

app.get("/api/projects", (req, res) => {
  const projects = db.prepare("SELECT * FROM projects").all();
  const fullProjects = projects.map(p => {
    const staff = db.prepare("SELECT * FROM construction_staff WHERE projectId = ?").all(p.id);
    const billing = db.prepare("SELECT * FROM billing_items WHERE projectId = ?").all(p.id);
    const outbound = db.prepare("SELECT * FROM outbound_payments WHERE projectId = ?").all(p.id);
    return { ...p, constructionStaff: staff, billingItems: billing, outboundPayments: outbound };
  });
  res.json(fullProjects);
});

app.post("/api/projects", (req, res) => {
  try {
    const { 
      id, status, estimateDate, orderDate, constructionStartDate, completionDate, paymentDate, title, propertyName,
      estimateRemarks, orderRemarks, constructionRemarks, billingRemarks, paymentRemarks, outboundPaymentRemarks,
      customerName, customerZipCode, customerAddress, customerTel, customerEmail,
      constructionStaff, billingItems, outboundPayments 
    } = req.body;

    const insertProject = db.prepare(`
      INSERT INTO projects (
        id, status, estimateDate, orderDate, constructionStartDate, completionDate, paymentDate, title, propertyName,
        estimateRemarks, orderRemarks, constructionRemarks, billingRemarks, paymentRemarks, outboundPaymentRemarks,
        customerName, customerZipCode, customerAddress, customerTel, customerEmail
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertStaff = db.prepare(`
      INSERT INTO construction_staff (id, projectId, name, zipCode, address, tel, email)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const insertBilling = db.prepare(`
      INSERT INTO billing_items (id, projectId, name, amount, expectedPaymentDate, isBilled, isPaid)
      VALUES (?, ?, ?, ?, ?, 0, 0)
    `);

    const insertOutbound = db.prepare(`
      INSERT INTO outbound_payments (id, projectId, recipient, amount, expectedDate, isPaid)
      VALUES (?, ?, ?, ?, ?, 0)
    `);

    const transaction = db.transaction(() => {
      insertProject.run(
        id, status, estimateDate, orderDate, constructionStartDate, completionDate, paymentDate, title, propertyName,
        estimateRemarks, orderRemarks, constructionRemarks, billingRemarks, paymentRemarks, outboundPaymentRemarks,
        customerName, customerZipCode, customerAddress, customerTel, customerEmail
      );

      if (constructionStaff && Array.isArray(constructionStaff)) {
        for (const staff of constructionStaff) {
          insertStaff.run(staff.id, id, staff.name, staff.zipCode, staff.address, staff.tel, staff.email);
        }
      }

      if (billingItems && Array.isArray(billingItems)) {
        for (const bill of billingItems) {
          insertBilling.run(bill.id, id, bill.name, bill.amount, bill.expectedPaymentDate);
        }
      }

      if (outboundPayments && Array.isArray(outboundPayments)) {
        for (const payment of outboundPayments) {
          insertOutbound.run(payment.id, id, payment.recipient, payment.amount, payment.expectedDate);
        }
      }
    });

    transaction();
    // Create SharePoint folder asynchronously using propertyName if available, otherwise title
    const folderName = propertyName || title;
    createSharePointFolder(folderName).catch(e => console.error("SharePoint Folder Creation Failed:", e));
    res.json({ success: true });
  } catch (error) {
    console.error("Error creating project:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
  }
});

app.get("/api/projects/:id", (req, res) => {
  const project = db.prepare("SELECT * FROM projects WHERE id = ?").get(req.params.id);
  if (!project) return res.status(404).json({ error: "Project not found" });
  
  const staff = db.prepare("SELECT * FROM construction_staff WHERE projectId = ?").all(req.params.id);
  const billing = db.prepare("SELECT * FROM billing_items WHERE projectId = ?").all(req.params.id);
  const outbound = db.prepare("SELECT * FROM outbound_payments WHERE projectId = ?").all(req.params.id);
  const files = db.prepare("SELECT * FROM files WHERE projectId = ?").all(req.params.id);
  
  const formattedProject = {
    ...project,
    constructionStaff: staff,
    billingItems: billing,
    outboundPayments: outbound,
    files
  };
  
  res.json(formattedProject);
});

app.patch("/api/projects/:id", (req, res) => {
  const { 
    status, estimateRemarks, orderRemarks, constructionRemarks, 
    billingRemarks, paymentRemarks, outboundPaymentRemarks 
  } = req.body;
  
  if (status !== undefined) {
    db.prepare("UPDATE projects SET status = ? WHERE id = ?").run(status, req.params.id);
  }
  if (estimateRemarks !== undefined) {
    db.prepare("UPDATE projects SET estimateRemarks = ? WHERE id = ?").run(estimateRemarks, req.params.id);
  }
  if (orderRemarks !== undefined) {
    db.prepare("UPDATE projects SET orderRemarks = ? WHERE id = ?").run(orderRemarks, req.params.id);
  }
  if (constructionRemarks !== undefined) {
    db.prepare("UPDATE projects SET constructionRemarks = ? WHERE id = ?").run(constructionRemarks, req.params.id);
  }
  if (billingRemarks !== undefined) {
    db.prepare("UPDATE projects SET billingRemarks = ? WHERE id = ?").run(billingRemarks, req.params.id);
  }
  if (paymentRemarks !== undefined) {
    db.prepare("UPDATE projects SET paymentRemarks = ? WHERE id = ?").run(paymentRemarks, req.params.id);
  }
  if (outboundPaymentRemarks !== undefined) {
    db.prepare("UPDATE projects SET outboundPaymentRemarks = ? WHERE id = ?").run(outboundPaymentRemarks, req.params.id);
  }
  
  res.json({ success: true });
});

app.patch("/api/billing_items/:id", (req, res) => {
  const { isBilled, isPaid } = req.body;
  if (isBilled !== undefined) {
    db.prepare("UPDATE billing_items SET isBilled = ? WHERE id = ?").run(isBilled ? 1 : 0, req.params.id);
  }
  if (isPaid !== undefined) {
    db.prepare("UPDATE billing_items SET isPaid = ? WHERE id = ?").run(isPaid ? 1 : 0, req.params.id);
  }
  res.json({ success: true });
});

app.patch("/api/outbound_payments/:id", (req, res) => {
  const { isPaid } = req.body;
  if (isPaid !== undefined) {
    db.prepare("UPDATE outbound_payments SET isPaid = ? WHERE id = ?").run(isPaid ? 1 : 0, req.params.id);
  }
  res.json({ success: true });
});

app.put("/api/projects/:id", (req, res) => {
  try {
    const { 
      status, estimateDate, orderDate, constructionStartDate, completionDate, paymentDate, title, propertyName,
      estimateRemarks, orderRemarks, constructionRemarks, billingRemarks, paymentRemarks, outboundPaymentRemarks,
      customerName, customerZipCode, customerAddress, customerTel, customerEmail,
      constructionStaff, billingItems, outboundPayments 
    } = req.body;
    const projectId = req.params.id;

    const updateProject = db.prepare(`
      UPDATE projects SET 
        status = ?, estimateDate = ?, orderDate = ?, constructionStartDate = ?, completionDate = ?, paymentDate = ?, title = ?, propertyName = ?,
        estimateRemarks = ?, orderRemarks = ?, constructionRemarks = ?, billingRemarks = ?, paymentRemarks = ?, outboundPaymentRemarks = ?,
        customerName = ?, customerZipCode = ?, customerAddress = ?, customerTel = ?, customerEmail = ?
      WHERE id = ?
    `);

    const deleteStaff = db.prepare("DELETE FROM construction_staff WHERE projectId = ?");
    const insertStaff = db.prepare(`
      INSERT INTO construction_staff (id, projectId, name, zipCode, address, tel, email)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const deleteBilling = db.prepare("DELETE FROM billing_items WHERE projectId = ?");
    const insertBilling = db.prepare(`
      INSERT INTO billing_items (id, projectId, name, amount, expectedPaymentDate, isBilled, isPaid)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const deleteOutbound = db.prepare("DELETE FROM outbound_payments WHERE projectId = ?");
    const insertOutbound = db.prepare(`
      INSERT INTO outbound_payments (id, projectId, recipient, amount, expectedDate, isPaid)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const transaction = db.transaction(() => {
      updateProject.run(
        status, estimateDate, orderDate, constructionStartDate, completionDate, paymentDate, title, propertyName,
        estimateRemarks, orderRemarks, constructionRemarks, billingRemarks, paymentRemarks, outboundPaymentRemarks,
        customerName, customerZipCode, customerAddress, customerTel, customerEmail,
        projectId
      );

      deleteStaff.run(projectId);
      if (constructionStaff && Array.isArray(constructionStaff)) {
        for (const staff of constructionStaff) {
          insertStaff.run(staff.id || Date.now().toString() + Math.random(), projectId, staff.name, staff.zipCode, staff.address, staff.tel, staff.email);
        }
      }

      deleteBilling.run(projectId);
      if (billingItems && Array.isArray(billingItems)) {
        for (const bill of billingItems) {
          insertBilling.run(bill.id || Date.now().toString() + Math.random(), projectId, bill.name, bill.amount, bill.expectedPaymentDate, bill.isBilled ? 1 : 0, bill.isPaid ? 1 : 0);
        }
      }

      deleteOutbound.run(projectId);
      if (outboundPayments && Array.isArray(outboundPayments)) {
        for (const payment of outboundPayments) {
          insertOutbound.run(payment.id || Date.now().toString() + Math.random(), projectId, payment.recipient, payment.amount, payment.expectedDate, payment.isPaid ? 1 : 0);
        }
      }
    });

    transaction();
    // Ensure SharePoint folder exists (in case title/propertyName changed or folder was deleted)
    const folderName = propertyName || title;
    createSharePointFolder(folderName).catch(e => console.error("SharePoint Folder Sync Failed:", e));
    res.json({ success: true });
  } catch (error) {
    console.error("Error updating project:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
  }
});

app.delete("/api/projects/:id", (req, res) => {
  db.prepare("DELETE FROM projects WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

app.get("/api/sharepoint/status", async (req, res) => {
  const client = await getGraphClient();
  if (!client) {
    return res.json({ 
      status: "error", 
      message: "Microsoft Graph Client initialization failed. Check environment variables." 
    });
  }
  try {
    const siteId = process.env.SHAREPOINT_SITE_ID;
    const driveId = process.env.SHAREPOINT_DRIVE_ID;
    await client.api(`/sites/${siteId}/drives/${driveId}`).get();
    res.json({ status: "ok", message: "Connected to SharePoint successfully." });
  } catch (e: any) {
    res.json({ status: "error", message: e.message || "Failed to connect to SharePoint." });
  }
});

app.post("/api/projects/:id/ai-doc", express.json(), async (req, res) => {
  const { content, fileName } = req.body;
  if (!content || !fileName) return res.status(400).json({ error: "Missing content or fileName" });

  const project = db.prepare("SELECT title, propertyName FROM projects WHERE id = ?").get(req.params.id);
  if (!project) return res.status(404).json({ error: "Project not found" });

  try {
    const folderName = project.propertyName || project.title;
    const fileBuffer = Buffer.from(content, 'utf-8');
    const result = await uploadFileToSharePoint(folderName, fileName, fileBuffer);
    
    if (result) {
      res.json({ success: true, url: result.webUrl });
    } else {
      res.status(500).json({ error: "Failed to upload to SharePoint" });
    }
  } catch (e) {
    console.error("AI Doc Upload Error:", e);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/projects/:id/files", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  const originalname = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
  const fileId = Date.now().toString();
  const fileUrl = `/uploads/${req.file.filename}`;

  // Get project title/propertyName for SharePoint folder
  const project = db.prepare("SELECT title, propertyName FROM projects WHERE id = ?").get(req.params.id);
  if (project) {
    try {
      const folderName = project.propertyName || project.title;
      const fileBuffer = fs.readFileSync(req.file.path);
      await uploadFileToSharePoint(folderName, originalname, fileBuffer);
    } catch (e) {
      console.error("Failed to upload to SharePoint:", e);
    }
  }

  db.prepare("INSERT INTO files (id, projectId, name, url) VALUES (?, ?, ?, ?)").run(
    fileId,
    req.params.id,
    originalname,
    fileUrl
  );
  
  // Backup DB to SharePoint after file upload as a simple way to keep it updated
  backupDatabaseToSharePoint().catch(console.error);

  res.json({ id: fileId, name: originalname, url: fileUrl });
});

app.delete("/api/files/:id", (req, res) => {
  const file = db.prepare("SELECT * FROM files WHERE id = ?").get(req.params.id);
  if (file) {
    const filePath = path.join(__dirname, file.url);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    db.prepare("DELETE FROM files WHERE id = ?").run(req.params.id);
  }
  res.json({ success: true });
});

app.use("/uploads", express.static(uploadDir));

// User Management API
app.get("/api/users", (req, res) => {
  const users = db.prepare("SELECT id, email, name, role, remarks, isActive FROM users").all();
  res.json(users.map(u => ({ ...u, isActive: !!u.isActive })));
});

app.post("/api/users", (req, res) => {
  const { id, email, password, name, role, remarks } = req.body;
  try {
    db.prepare("INSERT INTO users (id, email, password, name, role, remarks, isActive) VALUES (?, ?, ?, ?, ?, ?, 1)")
      .run(id, email, password, name, role, remarks);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: "Email already exists" });
  }
});

app.put("/api/users/:id", (req, res) => {
  const { email, password, name, role, remarks, isActive } = req.body;
  const updates = [];
  const params = [];

  if (email !== undefined) { updates.push("email = ?"); params.push(email); }
  if (password !== undefined) { updates.push("password = ?"); params.push(password); }
  if (name !== undefined) { updates.push("name = ?"); params.push(name); }
  if (role !== undefined) { updates.push("role = ?"); params.push(role); }
  if (remarks !== undefined) { updates.push("remarks = ?"); params.push(remarks); }
  if (isActive !== undefined) { updates.push("isActive = ?"); params.push(isActive ? 1 : 0); }

  if (updates.length > 0) {
    params.push(req.params.id);
    db.prepare(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`).run(...params);
  }
  res.json({ success: true });
});

app.delete("/api/users/:id", (req, res) => {
  // Prevent deleting the last admin if needed, but for now just delete
  db.prepare("DELETE FROM users WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

// Vite Integration
if (process.env.NODE_ENV !== "production") {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
} else {
  app.use(express.static(path.join(__dirname, "dist")));
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "dist", "index.html"));
  });
}

const PORT = 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://localhost:${PORT}`);
  
  // Confirm seed user
  const admin = db.prepare("SELECT email FROM users WHERE email = ?").get("admin@example.com");
  if (admin) {
    console.log("Admin user (admin@example.com) is ready.");
  } else {
    console.error("Warning: Admin user not found in database.");
  }

  // Initial backup on start (delayed to not block startup)
  setTimeout(() => {
    console.log("Running initial database backup...");
    backupDatabaseToSharePoint().catch(console.error);
  }, 5000);
});

// Periodic DB backup every hour
setInterval(() => {
  backupDatabaseToSharePoint().catch(console.error);
}, 1000 * 60 * 60);
