# Rookie Financial Planner

A client-side financial planning webapp that helps you manage cash flow, set financial goals, and calculate investment requirements. All data is stored locally in your browser - no server, no accounts, complete privacy.

## Features

### Cash Flow Calculator
- **Income Tracking**: Add multiple income sources (salary, freelance, rental income, etc.)
- **EPF/NPS Tracking**: Track monthly EPF and NPS contributions and existing corpus
- **Expense Management**: Track expenses with categories (housing, utilities, food, transport, etc.)
- **Net Cash Flow**: Automatic calculation of monthly surplus available for investments

### Financial Goals Manager
- **Create Multiple Goals**: Set up goals like retirement, child education, house down payment, emergency fund, etc.
- **Goal Types**:
  - **One-time Goals**: For specific targets with a defined end date
  - **Retirement Goals**: For ongoing income needs with special glide path considerations
    - Automatic EPF/NPS integration from cash flow
    - Optional EPF/NPS step-up with salary growth
    - EPF at 8% and NPS at 10% returns
- **Inflation Adjustment**: Each goal can have its own inflation rate (e.g., 6% for education, 4% for general expenses)
- **Target Date**: Set absolute dates for your goals with automatic timeline calculation

### Investment Calculator
- **Asset Allocation**: Configure equity/debt split for each goal
- **Post-Tax Returns**: Enter expected returns after tax for realistic projections
- **Annual SIP Step-Up**: Increase your SIP by a percentage each year (0-10%) to account for income growth
- **Initial Lumpsum**: Account for existing investments towards a goal
- **Monthly SIP Calculation**: Automatic calculation of required monthly investment

### Currency Support
Currently supports INR (₹) only.

| Asset Class | Range | Default | Labels |
|-------------|-------|---------|--------|
| Equity | 8% - 13% | 10% | 8-9% Conservative, 10-11% Realistic, 12-13% Optimistic |
| Debt | 4% - 7% | 5% | 4% Conservative, 5-6% Realistic, 7% Optimistic |

Returns are post-tax estimates based on historical market performance.

### Glide Path (Automatic Rebalancing)
The app automatically suggests reducing equity exposure as goals approach:

**One-time Goals:**
| Years to Goal | Maximum Equity |
|---------------|----------------|
| 10+ years     | 70%            |
| 8-10 years    | 60%            |
| 6-8 years     | 50%            |
| 4-6 years     | 30%            |
| 3-4 years     | 15%            |
| < 3 years     | 0%             |

**Retirement Goals:**
| Years to Goal | Maximum Equity |
|---------------|----------------|
| 10+ years     | 70%            |
| 8-10 years    | 60%            |
| 6-8 years     | 50%            |
| 4-6 years     | 40%            |
| 2-4 years     | 35%            |
| < 2 years     | 30% (minimum)  |

### Year-by-Year Projections
- View detailed projections showing corpus growth over time
- See expected returns for each year
- Track recommended rebalancing actions
- Collapsible table for clean interface

### Fund Recommendations (INR)
For INR currency, get specific fund recommendations from:
- **ICICI Prudential**
  - Nifty 50 Index Fund Direct Growth
  - Nifty Next 50 Index Fund Direct Growth
  - Money Market Fund Direct Growth
  - Equity Arbitrage Fund Direct Growth
- **HDFC**
  - Nifty 50 Index Fund Direct Growth
  - Nifty Next 50 Index Fund Direct Growth
  - Money Market Fund Direct Growth
  - Arbitrage Fund Direct Growth

**Equity Split**: 70% Nifty 50 + 30% Nifty Next 50
**Debt**: Money Market for long/mid-term, Arbitrage for short-term (tax efficiency)
**SIP Split**: Shows exact amounts per fund with total

### Investment Tracking
- Log investments made towards each goal
- Track investment history with dates and notes
- Automatic corpus calculation based on logged investments
- Dynamic SIP recalculation based on current progress

### Review Plan
- Comprehensive analysis of all goals
- Identifies goals that need attention
- Shows funding gaps and rebalancing needs

### Additional Features
- **Goal Reordering**: Prioritize goals with up/down buttons
- **Multi-tab Sync**: Changes sync across browser tabs
- **Responsive Design**: Works on desktop and mobile devices
- **Data Persistence**: All data stored in browser localStorage

### URL Routes
- `?sample_plan=1` - Load sample data with example goals
- `?clear=1` - Clear all data and start fresh

## Installation

### Prerequisites
- A modern web browser (Chrome, Firefox, Safari, Edge)
- Python 3.x (for running local server) OR any other HTTP server

### Quick Start

1. **Clone or download the repository**
   ```bash
   git clone <repository-url>
   cd financial-planner
   ```

2. **Start a local HTTP server**

   Using Python 3:
   ```bash
   python3 -m http.server 8080
   ```

   Or using Python 2:
   ```bash
   python -m SimpleHTTPServer 8080
   ```

   Or using Node.js (if you have `http-server` installed):
   ```bash
   npx http-server -p 8080
   ```

3. **Open in browser**

   Navigate to: [http://localhost:8080](http://localhost:8080)

### Why a Local Server?

The app uses ES6 modules which require HTTP protocol to work properly. Opening `index.html` directly (using `file://` protocol) will result in CORS errors.

## Running Tests

The app includes unit tests for the calculator functions:

1. Start the local server (see Quick Start above)
2. Navigate to: [http://localhost:8080/tests/test-runner.html](http://localhost:8080/tests/test-runner.html)
3. Click "Run Tests" to execute all tests

### Test Coverage

Tests cover:
- **Short-term goals** (< 3 years): Glide path to 0% equity
- **Mid-term goals** (3-10 years): Gradual equity reduction
- **Long-term goals** (10+ years): 70% max equity
- **Retirement goals**: Maintains 30% minimum equity
- **Effective XIRR**: Calculation with varying returns
- **SIP calculations**: With step-up and glide path
- **EPF/NPS calculations**: Corpus and SIP future values
- **EPF/NPS step-up**: Growing contributions with salary
- **Edge cases**: 0% step-up, 100% debt, initial lumpsum

## File Structure

```
financial-planner/
├── index.html          # Main HTML file
├── app.js              # Application initialization
├── styles.css          # Custom styles
├── favicon.svg         # App favicon
├── README.md           # This file
├── modules/
│   ├── storage.js      # LocalStorage wrapper
│   ├── currency.js     # Currency configuration
│   ├── calculator.js   # Financial calculations
│   ├── cashflow.js     # Cash flow UI & logic
│   ├── goals.js        # Goals management
│   └── investments.js  # Investment summary
└── tests/
    ├── test-runner.html    # Browser-based test runner
    ├── calculator.test.js  # Calculator unit tests
    ├── currency.test.js    # Currency formatting tests
    └── storage.test.js     # Storage/CRUD tests
```

## Usage Guide

### Setting Up Cash Flow

1. Click **+ Add** under Income to add income sources
2. Click **+ Add** under Expenses to add monthly expenses
3. View your net cash flow in the summary section

### Creating a Financial Goal

1. Click **+ Add Goal** button
2. Fill in the goal details:
   - **Goal Name**: e.g., "Child Education"
   - **Goal Type**: One-time or Retirement
   - **Target Amount**: Amount needed in today's value
   - **Inflation Rate**: Expected annual inflation for this goal
   - **Target Date**: When you need the money
   - **Equity/Debt Allocation**: Investment mix (limited by glide path)
   - **Expected Returns**: Post-tax returns for equity and debt
   - **Annual Step-Up**: Yearly increase in SIP amount
   - **Initial Lumpsum**: Existing investment towards this goal
3. Click **Save Goal**

### Tracking Investments

1. On any goal card, click **+ Add Investment**
2. Enter the investment amount, date, and optional note
3. View investment history by clicking the investments count link

### Reviewing Your Plan

Click **Review Plan** to see:
- Overall funding status
- Goals that need attention
- Rebalancing recommendations

## Data Privacy

- All data is stored locally in your browser's localStorage
- No data is ever sent to any server
- Your financial information never leaves your device
- Clearing browser data will erase all saved information

## Browser Support

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## Technical Details

### Calculations

**Inflation-adjusted Goal Amount:**
```
Future Value = Present Value × (1 + inflation_rate)^years
```

**Starting Blended Return:**
```
return = (equity% × equity_return) + (debt% × debt_return)
```

**Effective XIRR (with Glide Path):**
The app calculates an effective XIRR that accounts for the changing asset allocation over time due to the glide path. This gives a more accurate picture of expected returns.

For example, a 10-year one-time goal starting at 70% equity:
- Year 1: ~9% return (70% equity)
- Years 2-4: ~8% return (60% equity)
- Years 5-6: ~7% return (50% equity)
- Years 7-8: ~6% return (30% equity)
- Year 9: ~5.5% return (15% equity)
- Year 10: ~5% return (0% equity)

The effective XIRR is the single rate that would produce the same final corpus as these varying rates.

**SIP Calculation with Varying Returns:**
The SIP calculation uses the actual year-by-year expected returns based on the glide path, rather than a single fixed rate. This provides a more accurate required SIP amount.

**Monthly SIP with Step-Up:**
Uses iterative calculation to find the starting SIP amount that, when increased annually by the step-up percentage and compounded at year-appropriate returns, will reach the goal amount.

### LocalStorage Schema

```javascript
{
  "settings": {
    "currency": "INR",
    "fundHouse": "icici"
  },
  "cashflow": {
    "income": [{
      "id": "uuid",
      "name": "Salary",
      "amount": 100000,
      "epf": 12000,        // Monthly EPF contribution
      "nps": 5000,         // Monthly NPS contribution
      "epfCorpus": 500000, // Existing EPF corpus
      "npsCorpus": 200000  // Existing NPS corpus
    }],
    "expenses": [{ "id": "uuid", "category": "Housing", "name": "Rent", "amount": 25000 }]
  },
  "goals": [
    {
      "id": "uuid",
      "name": "Child Education",
      "goalType": "one-time",  // or "retirement"
      "targetAmount": 2000000,
      "inflationRate": 6,
      "targetDate": "2039-01-28",
      "equityPercent": 70,
      "debtPercent": 30,
      "equityReturn": 10,
      "debtReturn": 5,
      "annualStepUp": 5,
      "epfNpsStepUp": false,   // For retirement: grow EPF/NPS with salary
      "initialLumpsum": 100000,
      "startDate": "2024-01-28",
      "investments": []
    }
  ]
}
```

## Contributing

Feel free to submit issues and enhancement requests.

## License

MIT License - feel free to use and modify for personal or commercial use.
