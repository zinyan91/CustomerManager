using CustomerManager.Core.Enums;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace CustomerManager.Core.Helpers
{
    public static class DateRules
    {
        public static DeadlineSeverity GetSeverity(DateTime? dueDate, DateTime today)
        {
            if (dueDate == null) return DeadlineSeverity.None;

            var d = dueDate.Value.Date;
            var t = today.Date;

            if (d < t) return DeadlineSeverity.Overdue;

            var days = (d - t).TotalDays;

            if (days >= 45) return DeadlineSeverity.None;
            if (days >= 30) return DeadlineSeverity.Light;
            return DeadlineSeverity.Medium;
        }

        public static string GetDaysText(DateTime? dueDate, DateTime today)
        {
            if (dueDate == null) return "-";

            var d = dueDate.Value.Date;
            var t = today.Date;
            var days = (int)(d - t).TotalDays;

            if (days < 0) return $"Hết hạn {Math.Abs(days)} ngày";
            if (days == 0) return "Đến hạn hôm nay";
            return $"Còn {days} ngày";
        }

        public static DateTime? GetExpiryDate(DateTime? startDate, int? months)
        {
            if (startDate == null || months == null || months <= 0) return null;
            return startDate.Value.Date.AddMonths(months.Value);
        }

        public static string GetDaysLeftText(DateTime? targetDate, DateTime today)
        {
            if (targetDate == null) return "-";

            var d = targetDate.Value.Date;
            var t = today.Date;
            var days = (int)(d - t).TotalDays;

            if (days < 0) return $"Hết hạn {Math.Abs(days)} ngày";
            if (days == 0) return "Hết hạn hôm nay";
            return $"Còn {days} ngày";
        }

    }
}
