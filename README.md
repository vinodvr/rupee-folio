# RupeeFolio

![Tests](https://github.com/vinodvr/rupee-folio/actions/workflows/test.yml/badge.svg)

A client-side financial planning webapp that helps you manage cash flow, set financial goals, and calculate investment requirements. All data is stored locally in your browser - no server, no accounts, complete privacy.

## Features

### Quick Setup Wizard
New users can use the **Quick Setup** wizard to populate financial data in minutes:
- Answer simple questions about age, family, housing, income, and existing savings
- Automatically generates realistic income, expenses, assets, liabilities, and goals
- Creates Emergency Fund, Retirement at 50, and other relevant goals based on your situation

### Cash Flow Calculator
- **Income Tracking**: Add multiple income sources (salary, freelance, rental income, etc.)
- **EPF/NPS Tracking**: Track monthly EPF and NPS contributions
- **Expense Management**: Track expenses across 11 categories with helpful hints:
  - Housing (Rent, Society Maintenance)
  - Utilities (Electricity, Mobile, Broadband, Cable TV)
  - Food (Groceries, Vegetables, Dining Out)
  - Transport (Fuel, Vehicle Maintenance, Parking)
  - Health & Insurance (Medical, Premiums)
  - Education (Fees, Tuition, Books)
  - Children (Clothes, Activities, Pocket Money)
  - Household Help (Maid, Driver, Cook)
  - Lifestyle (Entertainment, Shopping, Subscriptions)
  - EMIs/Loans (Home, Car, Personal Loans)
  - Other (Miscellaneous)
- **Net Cash Flow**: Automatic calculation of monthly surplus available for investments

### Assets & Liabilities
- **Asset Tracking**: Track all your assets across categories (Real Estate, Vehicles, Bank/FDs, Stocks, Mutual Funds, Gold, EPF, NPS, Other)
- **Liability Tracking**: Track loans and debts (Home Loan, Car Loan, Personal Loan, Credit Card, Other)
- **Net Worth Calculation**: Automatic calculation of total assets, liabilities, and net worth
- **EPF/NPS Integration**: EPF and NPS corpus tracked as assets, automatically used in retirement goal calculations

### Financial Goals Manager
- **Create Multiple Goals**: Set up goals like retirement, child education, house down payment, emergency fund, etc.
- **Goal Types**:
  - **One-time Goals**: For specific targets with a defined end date
  - **Retirement Goals**: For ongoing income needs with EPF/NPS integration
    - Automatic EPF/NPS integration from cash flow
    - Optional EPF/NPS step-up with salary growth
    - Configurable EPF (default 8%) and NPS (default 9%) returns
- **Inflation Adjustment**: Each goal can have its own inflation rate (e.g., 6% for education, 4% for general expenses)
- **Target Date**: Set absolute dates for your goals with automatic timeline calculation

### Unified Portfolio Model
The app uses a simplified **Unified Portfolio** approach instead of per-goal allocations:

**Short-Term Goals (< 5 years):**
- 100% invested in Arbitrage Fund
- Low risk with equity taxation benefits
- Expected return: ~6% post-tax

**Long-Term Goals (5+ years):**
- Configurable equity/debt allocation (default 60/40)
- Equity split: 70% Nifty 50 + 30% Nifty Next 50
- Debt: Money Market Fund
- Adjustable from 20% to 80% equity
- **Equity Tapering (Glide Path)**: Automatically reduces equity exposure as goal approaches
  - 8+ years: Full equity allocation
  - 5-8 years: Half allocation (max 40%)
  - 3-5 years: Quarter allocation (max 20%)
  - < 3 years: 0% equity (100% debt)

This unified approach simplifies portfolio management by consolidating all goals into two buckets rather than managing separate allocations per goal.

### Investment Plan Tab
A dedicated tab for viewing your consolidated investment plan:
- **Compact Goal Cards**: Each goal shows name, target amount, timeline, and monthly SIP at a glance
- **Expandable Details**: Click "Details" to see FV breakdown, linked assets, EPF/NPS deductions, and gap to fill
- **Goal Categorization**: Goals automatically sorted into short-term and long-term buckets
- **Combined SIP Calculation**: Total monthly SIP needed per bucket
- **Link Existing Investments**: Assign existing assets to goals to reduce required SIP
- **Fund Recommendations**: Specific fund allocations from ICICI Prudential or HDFC
- **Cashflow Comparison**: Shows total SIP needed vs available cash flow with surplus/shortfall
- **Asset Allocation Controls**: Adjust equity/debt split for long-term goals
- **Return Settings**: Configure expected returns for equity, debt, arbitrage, EPF, and NPS

### Expected Returns
| Asset Class | Range | Default |
|-------------|-------|---------|
| Equity | 8% - 13% | 10% |
| Debt | 4% - 7% | 5% |
| Arbitrage | 4% - 8% | 6% |
| EPF | 7% - 9% | 8% |
| NPS | 8% - 11% | 9% |

Returns are post-tax estimates based on historical market performance.

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

**Short-Term Goals**: 100% Arbitrage Fund (equity taxation with debt-like risk)
**Long-Term Goals**:
- Equity (70% Nifty 50 + 30% Nifty Next 50)
- Debt (Money Market Fund)
**SIP Split**: Shows exact amounts per fund with total in the Investment Plan tab

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
- Node.js 16+ and npm
- A modern web browser (Chrome, Firefox, Safari, Edge)

### Quick Start

```bash
# Clone the repository
git clone <repository-url>
cd financial-planner

# Install dependencies
npm install

# Start the app (opens browser automatically)
npm start
```

The app will open at [http://localhost:8080](http://localhost:8080)

### Alternative (No Node.js)

If you don't have Node.js, you can use Python:

```bash
python3 -m http.server 8080
# Then open http://localhost:8080 in your browser
```

### Why a Local Server?

The app uses ES6 modules which require HTTP protocol to work properly. Opening `index.html` directly (using `file://` protocol) will result in CORS errors.

## Development

### Prerequisites

- Node.js 16+ (for npm scripts)
- A modern web browser

### Setup

```bash
# Install dependencies
npm install
```

### Running Locally

```bash
# Start dev server and open browser
npm start

# Start dev server only (no browser auto-open)
npm run dev
```

The app will be available at [http://localhost:8080](http://localhost:8080)

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode during development
npm run test:watch
```

**357 tests** organized into 7 suites:

| Suite | Tests | Coverage |
|-------|-------|----------|
| Calculator | 128 | SIP calculations, step-up SIP, equity tapering, unified portfolio, EPF/NPS projections, linked assets |
| Storage | 75 | CRUD operations, settings, schema migrations |
| Assets | 47 | EPF/NPS corpus, retirement assets, asset linking, allocations |
| Investment Plan | 35 | Goal categorization, SIP calculations, fund recommendations |
| Persona Data | 30 | Sample data generation, persona profiles |
| Currency | 26 | Formatting, return limits, fund recommendations |
| Cash Flow | 16 | Income/expense tracking, EPF/NPS contributions |

### Test Coverage

Tests cover:
- **Short-term goals** (< 5 years): 100% arbitrage allocation
- **Long-term goals** (5+ years): Configurable equity/debt split with tapering
- **Equity tapering (glide path)**: Phase boundaries, golden values, month-by-month verification
- **Unified portfolio categorization**: Correct bucket assignment
- **SIP calculations**: Regular SIP and step-up SIP with blended returns
- **Step-up SIP with tapering**: Combined annual step-up and equity glide path
- **Step-up SIP validation**: 0% step-up equals regular SIP, monotonic property, round-trip verification
- **EPF/NPS calculations**: Corpus and SIP future values with step-up
- **Retirement projections**: With EPF/NPS integration
- **Inflation adjustment**: Future value calculations
- **Golden values**: Verified against known correct calculations
- **Mathematical properties**: Linearity, rate/horizon relationships
- **Numerical stability**: Small/large targets, long horizons
- **Boundary conditions**: 5-year threshold, short horizons, past dates
- **Annuity due verification**: Confirms payment-at-start-of-period formula

### Project Architecture

```
modules/
├── calculator.js     # Pure functions for financial calculations
├── currency.js       # Currency formatting and fund data
├── storage.js        # LocalStorage CRUD operations
├── cashflow.js       # Cash Flow tab UI and logic
├── assets.js         # Assets & Liabilities tab UI and logic
├── goals.js          # Goals tab UI and logic
├── investmentplan.js # Investment Plan tab (aggregates all goals)
├── wizard.js         # Quick Setup wizard UI and flow
└── personaData.js    # Generates realistic data from wizard answers
```

**Key principles:**
- All modules use ES6 exports/imports
- UI modules manage their own DOM rendering
- `calculator.js` contains pure functions with no side effects (easy to test)
- `storage.js` is the only module that touches localStorage
- `app.js` coordinates initialization and cross-module communication

### Adding New Features

1. **New calculations**: Add to `modules/calculator.js` with corresponding tests in `tests/calculator.test.js`
2. **New UI sections**: Create a new module following the pattern in existing modules
3. **New settings**: Add to the settings object in `storage.js` and update `app.js` initialization

## File Structure

```
financial-planner/
├── index.html            # Main HTML file
├── app.js                # Application initialization
├── styles.css            # Custom styles
├── favicon.svg           # App favicon
├── README.md             # This file
├── modules/
│   ├── storage.js        # LocalStorage wrapper
│   ├── currency.js       # Currency configuration
│   ├── calculator.js     # Financial calculations (unified portfolio model)
│   ├── cashflow.js       # Cash flow UI & logic
│   ├── assets.js         # Assets & Liabilities management
│   ├── goals.js          # Goals management
│   ├── investmentplan.js # Investment Plan tab (unified portfolio view)
│   ├── wizard.js         # Quick Setup wizard UI and flow
│   └── personaData.js    # Generates realistic data from wizard answers
└── tests/
    ├── calculator.vitest.js      # SIP calculations, step-up, tapering, EPF/NPS (128 tests)
    ├── storage.vitest.js         # Storage/CRUD tests (75 tests)
    ├── assets.vitest.js          # Assets module tests (47 tests)
    ├── investmentplan.vitest.js  # Investment plan tests (35 tests)
    ├── personaData.vitest.js     # Sample data tests (30 tests)
    ├── currency.vitest.js        # Currency formatting tests (26 tests)
    └── cashflow.vitest.js        # Cash flow tests (16 tests)
```

## Usage Guide

The app is organized into four tabs: **Cash Flow**, **Assets**, **Goals**, and **Investment Plan**.

### Setting Up Cash Flow

1. On the **Cash Flow** tab, click **+ Add** under Income to add income sources
2. For salaried income, enter monthly EPF and NPS contributions
3. Click **+ Add** under Expenses to add monthly expenses
4. View your net cash flow and available investment amount in the summary

### Managing Assets & Liabilities

1. Switch to the **Assets** tab
2. Add assets like EPF corpus, NPS corpus, real estate, vehicles, etc.
3. Add liabilities like home loans, car loans, etc.
4. View your net worth summary at the top

### Creating a Financial Goal

1. Switch to the **Goals** tab and click **+ Add Goal** button
2. Fill in the goal details:
   - **Goal Name**: e.g., "Child Education"
   - **Goal Type**: One-time or Retirement
   - **Target Amount**: Amount needed in today's value
   - **Inflation Rate**: Expected annual inflation for this goal
   - **Target Date**: When you need the money
   - For Retirement goals: Configure EPF/NPS step-up with salary growth
3. Click **Save Goal**

### Using the Investment Plan

1. Switch to the **Investment Plan** tab to see your consolidated investment view
2. Goals are automatically categorized:
   - **Short-term** (< 5 years): Invested in Arbitrage Fund
   - **Long-term** (5+ years): Split between Equity and Debt funds
3. Adjust the **Asset Allocation** slider to change equity/debt split for long-term goals
4. Configure **Expected Returns** for each asset class
5. View **Fund Recommendations** with exact SIP amounts per fund
6. Compare total SIP needed against your available cash flow

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

**Unified Portfolio Model:**
The app uses a simplified two-bucket approach:

- **Short-term (< 5 years)**: 100% Arbitrage Fund
  - Return = arbitrage_return (default 6%)

- **Long-term (5+ years)**: Configurable equity/debt split with tapering
  - Return = (equity% × equity_return) + (debt% × debt_return)
  - Default: 60% equity (10%) + 40% debt (5%) = 8% blended return
  - **Equity Tapering**: Allocation reduces as goal approaches (see below)

**Equity Tapering (Glide Path):**
Long-term goals automatically reduce equity exposure to protect gains:
| Years Remaining | Equity Allocation |
|-----------------|-------------------|
| 8+ years | Initial allocation (e.g., 60%) |
| 5-8 years | min(initial/2, 40%) |
| 3-5 years | min(initial/4, 20%) |
| < 3 years | 0% (100% debt) |

SIP calculations factor in this tapering by simulating month-by-month compounding with varying rates, ensuring accurate projections.

**Monthly SIP Calculation:**
Uses annuity due formula (payment at beginning of period):
```
FV = PMT × [(1 + r)^n - 1] / r × (1 + r)
Solving for PMT: PMT = FV × r / [(1 + r)^n - 1] / (1 + r)
```
Where:
- FV = inflation-adjusted target amount
- r = monthly return (blended annual return / 12)
- n = months remaining

**Step-up SIP Calculation:**
For goals with annual step-up (e.g., 10% yearly increase), the app calculates the starting SIP that will accumulate to the target when contributions increase annually. This allows starting with a lower SIP that grows with income.

**Retirement Goals with EPF/NPS:**
For retirement goals, EPF and NPS contributions are factored in separately:
- EPF return: 8% (configurable)
- NPS return: 9% (configurable)
- Optional step-up: EPF/NPS contributions can grow with salary

### LocalStorage Schema

```javascript
{
  "settings": {
    "currency": "INR",
    "fundHouse": "icici",
    "equityAllocation": 60,    // Long-term equity allocation (20-80%)
    "equityReturn": 10,
    "debtReturn": 5,
    "arbitrageReturn": 6,
    "epfReturn": 8,
    "npsReturn": 9
  },
  "cashflow": {
    "income": [{
      "id": "uuid",
      "name": "Salary",
      "amount": 100000,
      "epf": 12000,        // Monthly EPF contribution
      "nps": 5000          // Monthly NPS contribution
    }],
    "expenses": [{ "id": "uuid", "category": "Housing", "name": "Rent", "amount": 25000 }]
  },
  "assets": {
    "items": [
      { "id": "uuid", "name": "EPF - Salary", "category": "EPF", "value": 500000 },
      { "id": "uuid", "name": "NPS - Salary", "category": "NPS", "value": 200000 },
      { "id": "uuid", "name": "Apartment", "category": "Real Estate", "value": 8000000 }
    ]
  },
  "liabilities": {
    "items": [
      { "id": "uuid", "name": "Home Loan", "category": "Home Loan", "amount": 5000000 }
    ]
  },
  "goals": [
    {
      "id": "uuid",
      "name": "Child Education",
      "goalType": "one-time",  // or "retirement"
      "targetAmount": 2000000,
      "inflationRate": 6,
      "targetDate": "2039-01-28",
      "includeEpfNps": false,   // For retirement: include EPF/NPS deductions
      "startDate": "2024-01-28"
    }
  ]
}
```

## Contributing

Feel free to submit issues and enhancement requests.

## License

PolyForm Noncommercial 1.0.0 - free to use and modify for personal, educational, and non-commercial purposes. Commercial use is not permitted. See [LICENSE](LICENSE) for details.
