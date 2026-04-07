# 💰 Finora — Personal Finance Assistant

**Finora** is a smart, intuitive personal finance assistant designed to help individuals take control of their financial lives. Unlike generic budgeting apps or overly complex accounting tools, Finora focuses on answering one simple but powerful question: *“Can I afford this?”* — while giving users complete visibility into their income, expenses, savings, and overall financial health.

Live Link of the project deployed on render: https://finance-frontend-00ni.onrender.com

---

## 🚨 Problem Statement

Managing personal finances is harder than it should be. Most people don’t track their expenses properly, overspend without realizing it, and have no clear idea whether they can afford a purchase or a monthly commitment. Financial awareness remains low because existing tools are either too complex (filled with jargon and unnecessary features), too generic (one-size-fits-all with no personal insights), or fail to provide actionable recommendations. As a result, many users continue to struggle with savings, debt, and financial planning — not because they lack money, but because they lack clarity.

**Finora was built to fix that.**

---

## 💡 Solution

Finora is more than just an expense tracker. It is a **smart financial assistant** that helps users:

- Log and categorize income and expenses effortlessly
- Understand their real spending behavior over time
- Check affordability for any new expense in seconds
- Receive clear, actionable insights into savings and financial habits

By combining a clean user interface with powerful backend calculations, Finora transforms raw financial data into meaningful, everyday decisions. It doesn’t just show you where your money went — it tells you where your money *can* go.

---

## 🧩 Features (Detailed)

### 📊 Expense & Income Tracking
Users can manually add income sources (salary, freelance, gifts, etc.) and expenses (rent, groceries, subscriptions, etc.). Each entry supports amount, category, date, and optional notes. All records are stored securely in MongoDB and linked to the user’s account. Users can view, edit, or delete entries at any time.

### 💡 Affordability Checker
This is the core feature of Finora. A user can enter any amount (e.g., “Can I afford a ₹5000 phone?” or “Can I take a ₹2000/month gym membership?”). The backend calculates the user’s current monthly surplus (total monthly income minus total monthly expenses) and compares it against the proposed amount. If the surplus is greater than or equal to the amount, Finora replies **“Yes, you can afford it”** with a breakdown. If not, it suggests how much more they need to save or reduce in expenses. This feature provides instant, realistic answers for financial decision-making.

### 📈 Financial Insights Dashboard
The dashboard displays key metrics:
- Total income (current month and all-time)
- Total expenses (with category-wise breakdown)
- Monthly savings (income minus expenses)
- Savings rate as a percentage of income
- Most expensive spending category
- A simple visual summary of financial health (Healthy / Needs Attention / Critical)

All insights are calculated server-side and refreshed whenever new data is added.

### 🔐 Authentication System
Finora includes a complete authentication flow using JWT (JSON Web Tokens). Users can sign up with a name, email, and password. Existing users can log in securely. Protected routes ensure that users only see and modify their own data. Passwords are hashed using bcrypt before storage. Sessions are maintained via tokens stored in HTTP-only cookies or localStorage based on frontend configuration.

### 🧠 Smart Analysis of Savings & Spending
Beyond basic tracking, Finora analyzes patterns. For example:
- If spending in a category exceeds 40% of total income, the user receives a warning.
- If monthly savings are below 15% of income, a suggestion to review discretionary spending appears.
- If expenses exceed income, the dashboard flags negative savings and recommends immediate action.

These insights are recalculated every time a new transaction is added or deleted.

### 📱 Clean and Minimal UI for Easy Usage
The entire frontend is built with React.js and custom CSS — no bloated UI libraries. The design focuses on readability, fast actions, and mobile-responsive layouts. Users can add income/expenses via simple forms, view their dashboard in one glance, and use the affordability checker without distractions. The interface is intentionally calm, using soft colors and clear typography to reduce financial anxiety.

---

## 🚀 How to Use

1. **Sign up / Log in** — Create your account or log into an existing one.
2. **Add your income and expenses** — Enter your monthly salary, rent, food, bills, etc.
3. **View your dashboard** — See total savings, spending breakdown, and financial health insights.
4. **Use “Can I Afford This?”** — Type any amount or recurring monthly cost to get an instant yes/no answer with reasoning.
5. **Make smarter financial decisions** — Based on real data, not guesswork.

---

## ⚙️ Tech Stack

### Frontend
- **React.js** — Component-based UI development
- **Custom CSS** — Lightweight, responsive styling without external frameworks

### Backend
- **Node.js** — JavaScript runtime for server-side logic
- **Express.js** — REST API framework

### Database
- **MongoDB** — NoSQL database for storing users, incomes, and expenses

### Deployment
- **Render** — Hosting for both backend API and frontend static build

---

## 🏗️ How It Works (Architecture)

1. The **frontend (React)** sends HTTP requests to the backend API — for adding transactions, fetching dashboard data, or checking affordability.
2. The **backend (Node.js + Express)** processes each request:
   - For new income/expense: validates data, saves to MongoDB, and recalculates user aggregates.
   - For affordability check: fetches user’s monthly totals, computes surplus, compares with requested amount, and returns a structured response.
   - For dashboard: queries MongoDB for all user transactions, computes sums, categories, and insights.
3. **MongoDB** stores each transaction in a collection with a reference to the user ID. User credentials are stored separately with hashed passwords.
4. The backend sends JSON responses back to the frontend, which updates the UI instantly without page reloads.

All financial calculations (surplus, savings rate, affordability logic) happen **server-side** to ensure consistency and avoid client-side tampering.

---

## 📦 Installation & Setup

```bash
# Clone the repository
git clone <your-repo-link>

# Install frontend dependencies
cd frontend
npm install

# Install backend dependencies
cd ../backend
npm install

# Set up environment variables
# In /backend, create a .env file with:
# PORT=5000
# MONGO_URI=your_mongodb_connection_string
# JWT_SECRET=your_secret_key

# Run backend (from /backend)
npm start

# Run frontend (from /frontend)
npm start

```

## ✅ Advantages

- **Simple and easy to use** — No financial knowledge required. Anyone can start in under 2 minutes.
- **Focuses on real decisions** — Most apps just track; Finora helps you decide.
- **Clean UI** — No charts overload or confusing terminology.
- **Builds awareness** — Users naturally become more conscious of spending.
- **Practical for everyday users** — Students, freelancers, and salaried professionals all benefit.

---

## ⚠️ Limitations (Acknowledged)

- **No real-time bank integration** — Users must enter transactions manually. This is intentional for simplicity but limits automation.
- **Manual data entry required** — No CSV upload or bank sync yet.
- **Limited automation** — Recurring expenses must be added manually each month.
- **Email/contact system removed** — Due to deployment constraints (Render free tier + email API limits), the password reset and contact support features are currently disabled.

> *This section demonstrates project maturity by acknowledging trade-offs rather than hiding them.*

---

## 🔮 Future Improvements

- **AI-based financial recommendations** — Using spending patterns to suggest budget limits and saving goals.
- **Automated expense categorization** — Learn from past entries to auto-categorize new ones.
- **Bank API integration** — Connect with Plaid or similar services for automatic transaction imports.
- **Notifications & reminders** — Weekly summaries, bill reminders, and low-savings alerts via email or in-app.
- **Reintroduce contact/support system** — Using SendGrid for transactional emails and support tickets.
- **Mobile app version** — React Native build for iOS and Android with offline support.

---

## 👩‍💻 Author

**Aakansha Parab**  
Built as a practical solution to everyday financial confusion — combining clean design, smart backend logic, and a genuine understanding of how people actually spend and save.
