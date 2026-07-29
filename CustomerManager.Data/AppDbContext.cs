using CustomerManager.Core.Models;
using Microsoft.EntityFrameworkCore;
using System;

namespace CustomerManager.Data;

public class AppDbContext : DbContext
{
    public DbSet<Customer> Customers { get; set; } = null!;
    public DbSet<LoanContract> LoanContracts { get; set; } = null!;
    public DbSet<Loan> Loans { get; set; } = null!;
    public DbSet<Collateral> Collaterals { get; set; } = null!;
    public DbSet<LoanCollateral> LoanCollaterals { get; set; } = null!;
    public DbSet<CreditCard> CreditCards { get; set; } = null!;
    public DbSet<ApprovalCondition> ApprovalConditions { get; set; } = null!;
    public DbSet<PostLoanControl> PostLoanControls { get; set; } = null!;
    public DbSet<LoanSchedule> LoanSchedules { get; set; } = null!;

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
    {
        if (!optionsBuilder.IsConfigured)
        {
            AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);

            // Kết nối trực tiếp tới Cloud Supabase PostgreSQL
            string connString = "Host=db.xkzntlaybrjlkcymqius.supabase.co;Port=5432;Database=postgres;Username=postgres;Password=Congbang1902@;SSL Mode=Require;Trust Server Certificate=true;Timeout=15;";
            optionsBuilder.UseNpgsql(connString);
        }
    }

    public static void InitializeDatabase()
    {
        try
        {
            using var db = new AppDbContext();
            db.Database.ExecuteSqlRaw(@"
                ALTER TABLE IF EXISTS ""Customers"" ADD COLUMN IF NOT EXISTS ""AccountNumber"" text DEFAULT '';
                ALTER TABLE IF EXISTS ""Customers"" ADD COLUMN IF NOT EXISTS ""SpouseAccountNumber"" text DEFAULT '';
                ALTER TABLE IF EXISTS ""Customers"" ADD COLUMN IF NOT EXISTS ""CifKhlq"" text DEFAULT '';
            ");
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"InitializeDatabase error: {ex.Message}");
        }
    }

    public static void AwaitInitialization()
    {
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<LoanCollateral>()
            .HasKey(lc => new { lc.LoanContractId, lc.CollateralId });

        modelBuilder.Entity<Customer>()
            .HasOne(c => c.ApprovalCondition)
            .WithOne(a => a.Customer)
            .HasForeignKey<ApprovalCondition>(a => a.CustomerId);

        modelBuilder.Entity<Customer>()
            .HasOne(c => c.PostLoanControl)
            .WithOne()
            .HasForeignKey<PostLoanControl>(p => p.CustomerId);

        modelBuilder.Entity<Customer>()
            .HasOne(c => c.CreditCard)
            .WithOne(cc => cc.Customer)
            .HasForeignKey<CreditCard>(cc => cc.CustomerId);
    }
}