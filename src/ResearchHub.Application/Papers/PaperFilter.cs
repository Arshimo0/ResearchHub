using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace ResearchHub.Application.Papers;
public record PaperFilter(string? Tag, string? Author, DateTime? FromDate, DateTime? ToDate);
