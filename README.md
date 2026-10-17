# Luggage, Handbag and Leather Bag Zipper Repair System

**CSE326 Internet Programming — CA2 Project**

### Team Members
- Vardan Rattan
- Kunal Sharda
- Vipul Sharma

---

## About the Project
This is our CA2 project for CSE326. It is a single-page website where users can check repair costs for common luggage issues (broken spinner wheels, stuck handles, torn zippers, and locked TSA locks), book a repair, and track their bag's repair progress with a booking ID.

## Features
- **Cost Estimator:** Select bag type, repair issue, and turnaround speed (standard or 24-hr express) to get an instant cost estimate in INR.
- **Smart Compatibility:** If you choose a backpack or leather handbag, trolley wheels and TSA lock options are disabled since they don't apply.
- **Booking Form:** Takes customer details, bag brand, pickup or drop-off choice, date, damage description, and an optional damage photo with preview.
- **Booking Confirmation:** Generates a unique ID like `MEND-XXXXXX` and saves the booking into `localStorage`.
- **Repair Tracking:** Enter the booking ID to see a 4-step status tracker (Booking received &rarr; Inspection &rarr; Repair in progress &rarr; Completed). We also added demo buttons so the teacher can change stages during viva.
- **My Repairs:** Lists all bookings saved in your browser with a quick button to track each one.

## Technologies Used
- HTML5
- CSS3 (Flexbox, Grid, fully responsive for phones and laptops)
- Vanilla JavaScript (ES6+, DOM manipulation, and localStorage)
- No frameworks, no external libraries (no React, jQuery, or Bootstrap), and no backend.

## Files
- `index.html` — The complete single-page website
- `style.css` — All styles and media queries
- `script.js` — Pricing calculation, form validation, and tracking logic
- `README.md` — This file

## How to Run
1. Just double click `index.html` to open it in any browser (Chrome, Edge, Firefox).
2. Or open the folder in VS Code and click **Open with Live Server**.
3. Or run `python3 -m http.server 8000` in the terminal and visit `http://localhost:8000`.

## How Pricing & Bookings Work
- All prices are set in a JavaScript object inside `script.js`:
  - Spinner wheel: ₹799 base
  - Telescopic handle: ₹649 base
  - Main zipper: ₹499 base
  - TSA lock: ₹299 base
  - Bag material adjustments (Hardshell +₹100, Soft fabric +₹50, Backpack +₹0, Leather handbag +₹200)
  - 24-Hour express adds ₹350
- When you click submit, JavaScript saves the booking directly into browser `localStorage`, so your booking is still there if you refresh the page.

## Limitations
- There is no backend database or server; all data is saved locally in the browser.
- This is a simulation for our college project — no real repair person or pickup courier is actually sent.
- Data saved in one browser won't show up on another device.
