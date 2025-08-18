# ProcessPilot 🚦

*A workflow & approval engine showcasing Business Analysis rigor + full-stack implementation.*

---

## 📌 Project Overview

ProcessPilot is a lightweight workflow and approval system where users can submit requests (e.g. leave, expense) and route them through configurable multi-step approvals.

This project demonstrates:

* **BA Skills** → requirements traceability, BPMN workflows, UAT test plans
* **Dev Skills** → Node.js backend, React frontend, CI/CD automation
* **PM Practices** → backlog, sprint tracking, release notes

---

## 🎯 Features

* Request submission form
* Multi-step approval routing (configurable)
* Status tracking (pending, approved, rejected)
* Admin dashboard to define approval flows
* Email notifications (optional integration)

---

## 🗂️ Repository Structure

```
portfolio-process-pilot/
  backend/       # Node.js + Express API
  frontend/      # React + Tailwind client
  docs/          # BA & PM artifacts
    requirements.md
    process-flow.bpmn
    uat-plan.md
    traceability-matrix.md
  .github/workflows/ci.yml   # CI/CD pipeline
  README.md
```

---

## 🔧 Tech Stack

* **Frontend:** React, TailwindCSS
* **Backend:** Node.js, Express
* **Database:** PostgreSQL (or MongoDB if you prefer NoSQL)
* **CI/CD:** GitHub Actions (build, test, deploy)
* **Deployment:** Vercel (frontend), Render/Heroku (backend)

---

## 📊 Business Analysis Deliverables

* **Requirements Specification** → [docs/requirements.md](docs/requirements.md)
* **Process Flow (BPMN)** → [docs/process-flow.bpmn](docs/process-flow.bpmn)
* **Traceability Matrix** → [docs/traceability-matrix.md](docs/traceability-matrix.md)
* **UAT Plan & Test Cases** → [docs/uat-plan.md](docs/uat-plan.md)

---

## 🚀 Getting Started

### 1. Clone repo

```bash
git clone https://github.com/<your-username>/portfolio-process-pilot.git
cd portfolio-process-pilot
```

### 2. Backend setup

```bash
cd backend
npm install
npm run dev
```

### 3. Frontend setup

```bash
cd frontend
npm install
npm start
```

### 4. Visit app

* Frontend → [http://localhost:3000](http://localhost:3000)
* Backend → [http://localhost:5000/api](http://localhost:5000/api)

---

## 🧪 Testing

* **Unit Tests:** Jest
* **E2E Tests:** Playwright (UI flows)
* Run with:

```bash
npm test
```

---

## 📈 Roadmap

* [ ] Basic CRUD for requests & approvals
* [ ] User authentication & roles
* [ ] Configurable approval chains
* [ ] Email notifications
* [ ] Metrics dashboard (approvals per dept, avg turnaround time)

---

## 📜 License

MIT License

---
