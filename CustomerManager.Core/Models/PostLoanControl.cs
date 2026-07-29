using System;

namespace CustomerManager.Core.Models;

public class PostLoanControl
{
    public int Id { get; set; }
    public int CustomerId { get; set; }
    public DateTime LastControlDate { get; set; }
    public string? Result { get; set; }
}
