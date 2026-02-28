# Grid Quest: Coordinate Explorer

An interactive educational application designed to help users learn and practice coordinate geometry through visual challenges and AI-generated puzzles.

## Preview

![Grid Quest Screenshot](./GridQuest.png) 

---

## How It Works

### 1. Grid System
The application features a 5x5 coordinate grid. 
- **Coordinates**: Uses a standard Cartesian system where (1,1) is the bottom-left corner and (5,5) is the top-right.
- **Dynamic Population**: Every time a "New Setup" is triggered, the app randomly places 6-8 unique symbols (sketches/icons) at integer coordinates.
- **Visuals**: Symbols are fetched from the Lucide icon set via the Iconify API to maintain a consistent, sketch-like aesthetic.

### 2. Challenge Engine
The app generates three types of questions:
- **Where is [Item]?**: Tests the user's ability to identify coordinates. Users must enter the answer in `x,y` format.
- **What is at (x,y)?**: Tests the user's ability to locate a point. This is presented as a **Multiple Choice** selection for better interactivity.
- **AI-Generated Questions**: Uses the **Gemini 3 Flash** model to analyze the current grid state. It can generate complex questions about relative positions, patterns, or proximity (e.g., "Which item is directly above the Robot?").

### 3. AI Integration
The `askAIQuestion` function sends a JSON-formatted description of the current grid layout to the Gemini API. The model returns a structured JSON object containing a creative question and its corresponding answer, which is then dynamically added to the user's challenge list.

### 4. Tech Stack
- **Frontend**: React 19 with TypeScript.
- **Styling**: Tailwind CSS 4.0 for a modern, responsive "Technical Dashboard" look.
- **Icons**: Lucide-React for UI elements.
- **Animations**: Framer Motion (motion) for smooth transitions and entrance effects.
- **AI**: `@google/genai` SDK for seamless integration with Google's Gemini models.

---

## How to Run Locally

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- A Google Gemini API Key (get one at [aistudio.google.com](https://aistudio.google.com/))

### Installation

1. **Clone the repository** (or download the source).
2. **Install dependencies**:
   ```bash
   npm install
   ```
3. **Configure Environment Variables**:
   Create a `.env` file in the root directory and add your API key:
   ```env
   GEMINI_API_KEY=your_api_key_here
   ```
4. **Start the development server**:
   ```bash
   npm run dev
   ```
5. **Open the app**:
   Navigate to `http://localhost:3000` in your browser.

### Building for Production
To create an optimized production build:
```bash
npm run build
```
The output will be in the `dist/` folder.
