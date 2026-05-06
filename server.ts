import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import compression from "compression";
import { Resend } from "resend";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let resend: Resend | null = null;
if (process.env.RESEND_API_KEY) {
  resend = new Resend(process.env.RESEND_API_KEY);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(compression());
  app.use(express.json());

  // Email API for reservations
  app.post("/api/send-reservation-email", async (req, res) => {
    const { email, fullName, date, time, tableNumber, guests, status } = req.body;

    if (!resend) {
      console.warn("RESEND_API_KEY is not set. Skipping email.");
      return res.json({ success: false, error: "Email service not configured" });
    }

    let subject = `Reservation Update: Table ${tableNumber}`;
    let title = "Reservation Update";
    let message = "Your reservation status has been updated.";
    let color = "#D4AF37"; // Gold

    switch (status) {
      case 'confirmed':
        subject = `Reservation Confirmed: Table ${tableNumber}`;
        title = "Reservation Confirmed";
        message = "Excellent news! Your reservation has been officially confirmed by our team.";
        color = "#10B981"; // Green
        break;
      case 'booked':
        subject = `Table Ready: Table ${tableNumber}`;
        title = "Table Booked & Ready";
        message = "Your table is now fully booked and prepared for your arrival. See you soon!";
        color = "#3B82F6"; // Blue
        break;
      case 'cancelled':
        subject = `Reservation Cancelled: Table ${tableNumber}`;
        title = "Reservation Cancelled";
        message = "We're sorry, but your reservation has been cancelled. If this was a mistake, please contact us.";
        color = "#EF4444"; // Red
        break;
      case 'pending':
      default:
        subject = "Reservation Request Received";
        title = "Request Received";
        message = "We have received your reservation request and are currently reviewing table availability.";
        break;
    }

    try {
      const { data, error } = await resend.emails.send({
        from: 'Kiss Me Store <reservations@resend.dev>',
        to: [email],
        subject: subject,
        html: `
          <div style="font-family: serif; color: #000; padding: 40px; background: #fff; border: 1px solid #eee;">
            <h1 style="color: ${color}; text-transform: uppercase; font-size: 24px; border-bottom: 2px solid ${color}; padding-bottom: 10px; margin-bottom: 20px;">
              Kiss Me Store & Food Corner
            </h1>
            <h2 style="font-size: 18px; margin-bottom: 10px;">${title}</h2>
            <p>Dear <strong>${fullName}</strong>,</p>
            <p>${message}</p>
            <div style="background: #F9F9F9; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #eee;">
              <p style="margin: 5px 0;"><strong>Table:</strong> ${tableNumber || 'To be assigned'}</p>
              <p style="margin: 5px 0;"><strong>Date:</strong> ${date}</p>
              <p style="margin: 5px 0;"><strong>Time:</strong> ${time}</p>
              <p style="margin: 5px 0;"><strong>Guests:</strong> ${guests}</p>
              <p style="margin: 5px 0;"><strong>New Status:</strong> <span style="color: ${color}; font-weight: bold; text-transform: uppercase;">${status}</span></p>
            </div>
            <p>Thank you for choosing Kiss Me Store & Food Corner.</p>
            <p style="font-size: 12px; color: #666; margin-top: 40px; border-top: 1px solid #eee; padding-top: 20px;">
              © 2026 Kiss me Store & Food Corner. All rights reserved.<br/>
              <em>Tagoloan, Misamis Oriental</em>
            </p>
          </div>
        `,
      });

      if (error) {
        console.error("Resend error:", error);
        return res.status(400).json({ success: false, error });
      }

      res.json({ success: true, data });
    } catch (err) {
      console.error("Failed to send email:", err);
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  });

  // API placeholders for payment gateways
  app.post("/api/payments/create-checkout", async (req, res) => {
    // In a real app, integrate with Stripe/Maya here
    res.json({ success: true, checkoutUrl: "#" });
  });

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: false // HMR is disabled in AI Studio
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    
    // Serve static files with caching
    app.use(express.static(distPath, { 
      index: false,
      maxAge: '1d',
      setHeaders: (res, path) => {
        if (path.endsWith('.html')) {
          res.setHeader('Cache-Control', 'no-cache');
        }
      }
    }));
    
    // Explicit SPA fallback for production
    app.get('*', (req, res) => {
      console.log(`[Production] Fallback for: ${req.url}`);
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Generic error handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  });
}

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

startServer();
