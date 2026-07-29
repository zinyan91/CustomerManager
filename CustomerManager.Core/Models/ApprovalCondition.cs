using System.ComponentModel.DataAnnotations.Schema;

namespace CustomerManager.Core.Models;

public class ApprovalCondition
{
    public int Id { get; set; }
    public int CustomerId { get; set; }
    public Customer? Customer { get; set; }

    public bool Casa { get; set; }
    public int CashFlowPercent { get; set; }
    public bool IsPass { get; set; }

    [NotMapped]
    public bool IsFulfilled { get => IsPass; set => IsPass = value; }

    public string? Note { get; set; }

    [NotMapped]
    public string ConditionText { get => Note ?? "Điều kiện phê duyệt trước giải ngân"; set => Note = value; }
}