using CommunityToolkit.Mvvm.ComponentModel;
using CustomerManager.Data;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace CustomerManager.ViewModels.Pages;

public partial class OverviewViewModel : ObservableObject
{
    [ObservableProperty] private int _totalCustomerCount;
    [ObservableProperty] private int _totalLoanCount;
    [ObservableProperty] private decimal _totalOutstandingAmount;
    [ObservableProperty] private decimal _totalCollateralValue;

    [ObservableProperty] private int _group1Count;
    [ObservableProperty] private int _group2Count;
    [ObservableProperty] private int _group3To5Count;

    public OverviewViewModel()
    {
        _ = LoadStatistics();
    }

    public async Task LoadStatistics()
    {
        try
        {
            using var db = new AppDbContext();

            TotalCustomerCount = await db.Customers.CountAsync();
            TotalLoanCount = await db.Loans.CountAsync();
            
            TotalOutstandingAmount = await db.Loans
                .Where(l => l.Status == "Đã giải ngân")
                .SumAsync(l => (decimal?)l.Amount) ?? 0;

            TotalCollateralValue = await db.Collaterals
                .SumAsync(c => (decimal?)c.AppraisedValue) ?? 0;

            Group1Count = await db.Loans.Where(l => l.DebtGroup == 1).CountAsync();
            Group2Count = await db.Loans.Where(l => l.DebtGroup == 2).CountAsync();
            Group3To5Count = await db.Loans.Where(l => l.DebtGroup >= 3).CountAsync();
        }
        catch { }
    }
}
