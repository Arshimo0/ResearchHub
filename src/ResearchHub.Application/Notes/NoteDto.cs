using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace ResearchHub.Application.Notes;
public record NoteDto(Guid Id, Guid PaperId, Guid AuthorId, string Content, DateTime CreatedAt, DateTime? UpdatedAt);