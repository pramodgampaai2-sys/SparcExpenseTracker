import React, { useMemo, useState, useEffect } from 'react';
import type { Expense } from '../types';
import StatCard from './StatCard';
import CategoryChart from './CategoryChart';
import MonthlyComparisonChart from './MonthlyComparisonChart';
import { ChartPieIcon, CalendarIcon, TrendingUpIcon, CogIcon, SparklesIcon, DocumentTextIcon, ChevronLeftIcon, ChevronRightIcon } from './Icons';
import { Page } from '../constants';
import { generateMonthlyReport } from '../services/geminiService';
import { jsPDF } from 'jspdf';

interface DashboardProps {
  expenses: Expense[];
  currencySymbol: string;
  onNavigate: (page: Page) => void;
  allCategoryColors: Record<string, string>;
  allCategoryNames: string[];
}

// Tile component for navigation within the dashboard
const ReportTile: React.FC<{
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
}> = ({ title, description, icon, onClick }) => (
  <button
    onClick={onClick}
    className="w-full bg-white p-4 rounded-xl shadow-md text-left flex items-center space-x-4 hover:bg-gray-50 active:bg-gray-100 transition-colors"
  >
    <div className="flex-shrink-0 w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center">
      {icon}
    </div>
    <div className="flex-grow">
      <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
      <p className="text-sm text-gray-500">{description}</p>
    </div>
    <ChevronRightIcon className="w-5 h-5 text-gray-400" />
  </button>
);


const Dashboard: React.FC<DashboardProps> = ({ expenses, currencySymbol, onNavigate, allCategoryColors, allCategoryNames }) => {
  const [view, setView] = useState<'main' | 'category' | 'monthly'>('main');
  const [isClient, setIsClient] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [selectedReportMonth, setSelectedReportMonth] = useState<string>('');

  useEffect(() => {
    setIsClient(true);
  }, []);

  const { todaySpend, thisMonthSpend, lastMonthSpend, categoryData, monthlyComparisonData } = useMemo(() => {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth(); // 0-indexed month

    // Define time boundaries using UTC for consistency.
    const startOfTodayUTC = Date.UTC(year, month, now.getUTCDate());
    const startOfThisMonthUTC = Date.UTC(year, month, 1);
    const startOfLastMonthUTC = Date.UTC(year, month - 1, 1);
    const startOfTwoMonthsAgoUTC = Date.UTC(year, month - 2, 1);
    const startOfNextMonthUTC = Date.UTC(year, month + 1, 1);
    
    // Helper to get short month name from a UTC timestamp, ensuring timezone consistency
    const getMonthName = (utcTimestamp: number) => new Date(utcTimestamp).toLocaleString('default', { month: 'short', timeZone: 'UTC' });
    const thisMonthName = getMonthName(startOfThisMonthUTC);
    const lastMonthName = getMonthName(startOfLastMonthUTC);
    const twoMonthsAgoName = getMonthName(startOfTwoMonthsAgoUTC);

    let todaySpend = 0;
    let thisMonthSpend = 0;
    let lastMonthSpend = 0;
    let twoMonthsAgoSpend = 0;
    const categoryTotals: { [key: string]: number } = {};

    for (const expense of expenses) {
      // Date strings in 'YYYY-MM-DD' format are parsed as UTC midnight.
      const expenseTimeUTC = Date.parse(expense.date);
      if (isNaN(expenseTimeUTC)) continue; // Skip any invalid date formats

      // Today's Spend (can be part of this month)
      if (expenseTimeUTC >= startOfTodayUTC) {
        todaySpend += expense.amount;
      }

      // Aggregate monthly spends with explicit date ranges for accuracy.
      if (expenseTimeUTC >= startOfThisMonthUTC && expenseTimeUTC < startOfNextMonthUTC) {
        thisMonthSpend += expense.amount;
        categoryTotals[expense.category] = (categoryTotals[expense.category] || 0) + expense.amount;
      } else if (expenseTimeUTC >= startOfLastMonthUTC && expenseTimeUTC < startOfThisMonthUTC) {
        lastMonthSpend += expense.amount;
      } else if (expenseTimeUTC >= startOfTwoMonthsAgoUTC && expenseTimeUTC < startOfLastMonthUTC) {
        twoMonthsAgoSpend += expense.amount;
      }
    }

    const categoryData = Object.entries(categoryTotals).map(([name, value]) => ({ name, value }));
    
    // Filter out months with no spending data to only show relevant bars in the chart.
    const monthlyComparisonData = [
        { name: twoMonthsAgoName, spend: twoMonthsAgoSpend },
        { name: lastMonthName, spend: lastMonthSpend },
        { name: thisMonthName, spend: thisMonthSpend },
    ].filter(d => d.spend > 0);

    return { todaySpend, thisMonthSpend, lastMonthSpend, categoryData, monthlyComparisonData };
  }, [expenses]);
  
  const availableReportMonths = useMemo(() => {
    const monthSet = new Set<string>();
    expenses.forEach(expense => {
      monthSet.add(expense.date.substring(0, 7)); // YYYY-MM
    });

    // If there are no expenses, add the current month as an option
    if (monthSet.size === 0) {
        const now = new Date();
        const year = now.getFullYear();
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        monthSet.add(`${year}-${month}`);
    }

    return Array.from(monthSet)
      .sort()
      .reverse() // Most recent first
      .map(monthStr => {
        const [year, month] = monthStr.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1, 1);
        const monthName = date.toLocaleString('default', { month: 'long' });
        return {
          value: monthStr,
          label: `${monthName} ${year}`
        };
      });
  }, [expenses]);
  
  useEffect(() => {
    if (availableReportMonths.length > 0 && !selectedReportMonth) {
      setSelectedReportMonth(availableReportMonths[0].value);
    }
  }, [availableReportMonths, selectedReportMonth]);
  
  const expensesForSelectedMonth = useMemo(() => {
    if (!selectedReportMonth) return [];
    return expenses.filter(expense => expense.date.startsWith(selectedReportMonth));
  }, [expenses, selectedReportMonth]);


  const monthlyChange = useMemo(() => {
    if (lastMonthSpend === 0) return thisMonthSpend > 0 ? 100 : 0;
    return ((thisMonthSpend - lastMonthSpend) / lastMonthSpend) * 100;
  }, [thisMonthSpend, lastMonthSpend]);
  
  const handleDownloadReport = async () => {
    if (expensesForSelectedMonth.length === 0) {
      alert("No expenses in the selected month to generate a report.");
      return;
    }
    setIsGeneratingReport(true);
    try {
      const selectedMonthLabel = availableReportMonths.find(m => m.value === selectedReportMonth)?.label ?? 'the selected period';
      
      const analysisText = await generateMonthlyReport(expensesForSelectedMonth, currencySymbol, selectedMonthLabel, allCategoryNames);
      
      if (!analysisText) {
        alert("Sorry, we couldn't generate the report at this time. Please try again later.");
        return;
      }
      
      // More robust error handling before attempting to generate a PDF.
      if (analysisText.startsWith("Report generation failed")) {
          alert(`Could not generate report.\n\nReason: ${analysisText.replace("Report generation failed: ", "")}`);
          return;
      }
      
      if (analysisText.includes("not available in this environment")) {
         alert(analysisText);
         return;
      }
      
      const doc = new jsPDF({ format: 'a4' });
      const margin = 15;
      const pageHeight = doc.internal.pageSize.height;
      const pageWidth = doc.internal.pageSize.width;
      const textWidth = pageWidth - margin * 2;
      let y = margin;
      const lineHeight = 7; 
      const sectionSpacing = 10; 
      const paragraphSpacing = 5; 

      doc.setFont('helvetica', 'normal');
      
      doc.setFontSize(16);
      doc.text(`Monthly Expense Report: ${selectedMonthLabel}`, margin, y);
      y += lineHeight * 2;

      doc.setFontSize(14);
      doc.text('Category-wise Expenditure', margin, y);
      y += lineHeight * 1.5;
      
      const categoryTotals: { [key: string]: number } = {};
      for (const expense of expensesForSelectedMonth) {
          categoryTotals[expense.category] = (categoryTotals[expense.category] || 0) + expense.amount;
      }
      const sortedCategories = Object.entries(categoryTotals).sort(([, a], [, b]) => b - a);

      doc.setFontSize(12);
      if (sortedCategories.length > 0) {
          for (const [category, amount] of sortedCategories) {
              if (y > pageHeight - margin) { 
                  doc.addPage();
                  y = margin;
              }
              const categoryLine = `${category}: ${currencySymbol}${amount.toFixed(2)}`;
              doc.text(categoryLine, margin, y);
              y += lineHeight;
          }
      } else {
          doc.text('No expenses recorded for this month.', margin, y);
          y += lineHeight;
      }

      y += sectionSpacing;

      if (y > pageHeight - (margin + 20)) { 
          doc.addPage();
          y = margin;
      }
      doc.setFontSize(14);
      doc.text('Analysis and Suggestions', margin, y);
      y += lineHeight * 1.5;
      
      doc.setFontSize(12);
      
      const cleanedAnalysisText = analysisText
          .replace(/(\*\*|__|\*|_|#|`)/g, '')
          .trim();
          
      const paragraphs = cleanedAnalysisText.split(/\n\s*\n/);
      
      paragraphs.forEach(paragraph => {
          const singleLineParagraph = paragraph.replace(/\n/g, ' ').trim();
          if (singleLineParagraph.length === 0) return;

          const textLines = doc.splitTextToSize(singleLineParagraph, textWidth);
          const blockHeight = textLines.length * lineHeight;
          
          if (y + blockHeight > pageHeight - margin) {
              doc.addPage();
              y = margin;
          }
          
          doc.text(textLines, margin, y);
          y += blockHeight + paragraphSpacing;
      });
  
      const [year, month] = selectedReportMonth.split('-');
      doc.save(`sparc-monthly-report-${year}-${month}.pdf`);

    } catch (error) {
      console.error("Failed to generate or download report:", error);
      alert("An error occurred while generating the report.");
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const handleBack = () => setView('main');

  if (view === 'category') {
    return (
      <div className="space-y-4 animate-fade-in">
        <header className="flex items-center">
          <button
            onClick={handleBack}
            className="p-2 -ml-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
            aria-label="Back to dashboard"
          >
            <ChevronLeftIcon className="w-7 h-7" />
          </button>
          <h1 className="text-xl font-bold text-gray-900 ml-2">Spending by Category</h1>
        </header>
        <div className="bg-white p-4 rounded-xl shadow-md">
          {!isClient ? (
            <p className="text-gray-500 text-center py-8">Loading chart...</p>
          ) : categoryData.length > 0 ? (
            <CategoryChart data={categoryData} currencySymbol={currencySymbol} allCategoryColors={allCategoryColors} />
          ) : (
            <p className="text-gray-500 text-center py-8">No spending this month to show.</p>
          )}
        </div>
      </div>
    );
  }

  if (view === 'monthly') {
    return (
      <div className="space-y-4 animate-fade-in">
        <header className="flex items-center">
           <button
            onClick={handleBack}
            className="p-2 -ml-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
            aria-label="Back to dashboard"
          >
            <ChevronLeftIcon className="w-7 h-7" />
          </button>
          <h1 className="text-xl font-bold text-gray-900 ml-2">Monthly Comparison</h1>
        </header>
        <div className="bg-white p-4 rounded-xl shadow-md">
          {!isClient ? (
              <p className="text-gray-500 text-center py-8">Loading chart...</p>
            ) : monthlyComparisonData.length > 0 ? (
              <>
                <MonthlyComparisonChart data={monthlyComparisonData} currencySymbol={currencySymbol} />
                 {monthlyComparisonData.length >= 2 && lastMonthSpend > 0 && (
                   <div className="text-center mt-2">
                       <p className={`text-sm font-medium ${monthlyChange >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                          {monthlyChange >= 0 ? '▲' : '▼'} {Math.abs(monthlyChange).toFixed(1)}% {monthlyChange >= 0 ? 'increase' : 'decrease'} vs last month
                       </p>
                   </div>
                 )}
              </>
            ) : (
              <p className="text-gray-500 text-center py-8">No spending in recent months to compare.</p>
            )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500">Your expenses overview.</p>
        </div>
        <button
          onClick={() => onNavigate(Page.Settings)}
          className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
          aria-label="Open settings"
        >
          <CogIcon className="w-7 h-7" />
        </button>
      </header>

      <div className="grid grid-cols-2 gap-4">
        <StatCard title="Today's Spend" value={todaySpend.toFixed(2)} prefix={currencySymbol} />
        <StatCard title="This Month" value={thisMonthSpend.toFixed(2)} prefix={currencySymbol} />
      </div>
      
      {expenses.length > 0 ? (
        <>
          <div className="space-y-4 pt-2">
            <ReportTile
                title="Spending by Category"
                description="View a breakdown of your expenses."
                icon={<ChartPieIcon className="w-6 h-6" />}
                onClick={() => setView('category')}
            />
            <ReportTile
                title="Monthly Comparison"
                description="Compare your spending over time."
                icon={<CalendarIcon className="w-6 h-6" />}
                onClick={() => setView('monthly')}
            />
          </div>

          <div className="bg-white p-4 rounded-xl shadow-md">
            <h2 className="text-lg font-semibold text-gray-800 mb-2 flex items-center">
              <DocumentTextIcon className="w-5 h-5 mr-2 text-indigo-500" />
              Monthly Analysis Report
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              Select a month to get an AI-powered analysis of your spending.
            </p>
            <div className="mb-4">
                <label htmlFor="month-select" className="sr-only">Select month for report</label>
                <select
                    id="month-select"
                    name="month-select"
                    value={selectedReportMonth}
                    onChange={(e) => setSelectedReportMonth(e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3"
                    disabled={availableReportMonths.length <= 1 && expenses.length === 0}
                    aria-label="Select month for report"
                >
                    {availableReportMonths.map(month => (
                        <option key={month.value} value={month.value}>
                            {month.label}
                        </option>
                    ))}
                </select>
            </div>
            <button
              onClick={handleDownloadReport}
              disabled={isGeneratingReport || expensesForSelectedMonth.length === 0}
              className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed transition-colors"
            >
              {isGeneratingReport ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <>
                  <SparklesIcon className="w-5 h-5 mr-2" />
                  Generate & Download
                </>
              )}
            </button>
            {expensesForSelectedMonth.length === 0 && selectedReportMonth && (
                <p className="text-xs text-gray-500 mt-2 text-center">
                  No expenses logged for the selected month to generate a report.
                </p>
            )}
          </div>
        </>
      ) : (
        <div className="text-center py-16 bg-white rounded-xl shadow-md">
          <TrendingUpIcon className="w-16 h-16 mx-auto text-gray-300" />
          <h2 className="mt-4 text-xl font-semibold text-gray-700">No Expenses Logged</h2>
          <p className="mt-2 text-gray-500">Start by adding your first expense!</p>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
