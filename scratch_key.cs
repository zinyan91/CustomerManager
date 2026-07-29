using System;
using Microsoft.EntityFrameworkCore;
using CustomerManager.Data;
using System.Text.Json;
using System.Text;

class Program
{
    static void Main()
    {
        using var db = new AppDbContext();
        using var cmd = db.Database.GetDbConnection().CreateCommand();
        cmd.CommandText = "SHOW app.settings.jwt_secret;";
        db.Database.OpenConnection();
        var secret = cmd.ExecuteScalar()?.ToString();
        Console.WriteLine($"JWT_SECRET={secret}");
    }
}
