using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using ResearchHub.Domain.Entities;


namespace ResearchHub.Application.Common
{
    public interface INoteRepository
    {
        Task<Note?> GetByIdAsync(Guid id);
        Task<IReadOnlyList<Note>> GetByPaperIdAsync(Guid paperId);
        Task AddAsync(Note note);
        void Remove(Note note);
    }
}