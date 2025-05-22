# WikiWander

**WikiWander** is a web-based game that challenges players to traverse from one Wikipedia article to another using only in-article hyperlinks. It’s a test of knowledge, logic, and link intuition.

> 🔗 Live: [https://wiki-wander.vercel.app](https://wiki-wander.vercel.app)  
> 🧠 GitHub: [github.com/Weirdnemo/WikiWander](https://github.com/Weirdnemo/WikiWander)

---

## 🎮 Gameplay

- Start from a **random** or **custom** Wikipedia article.
- Reach the **target article** by clicking only valid internal links.
- Track your **click count** and **elapsed time**.
- View your entire **navigation path**.
- Reach the destination in the **shortest path possible** to optimize your score.

---

## 🛠️ Features

- Wikipedia article fetching via MediaWiki API
- Internal link filtering (valid, visible article links only)
- Custom or random start/end article selection
- Dynamic article rendering
- Real-time progress tracker (clicks, time, path)
- Deployed on Vercel

---

## 🧱 Tech Stack

- **Frontend**: React + Tailwind CSS + Vite
- **Backend (optional)**: FastAPI (for leaderboard or future extensions)
- **Data Source**: MediaWiki API
- **Deployment**: Vercel

---

## 🚀 Getting Started

### Clone the repository

```bash
git clone https://github.com/Weirdnemo/WikiWander.git
cd WikiWander

```
This project is licensed under the MIT License.
Wikipedia content is used under [CC BY-SA 3.0.](https://creativecommons.org/licenses/by-sa/3.0/)

Created by @Weirdnemo
