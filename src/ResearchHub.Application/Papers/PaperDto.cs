using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace ResearchHub.Application.Papers
{
    public record PaperDto(
        Guid Id,
        Guid ProjectId,
        string Title,
        string Authors,
        string Abstract,
        DateTime? PublicationDate,
        string? DoiOrUrl,
        string? PdfReference,
        Guid AddedByUserId,
        DateTime CreatedAt,
        IReadOnlyCollection<string> Tags);
}