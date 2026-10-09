using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using ResearchHub.Application.Common;
using ResearchHub.Domain.Entities;

namespace ResearchHub.Infrastructure.Persistence
{
    public class NoteRepository : INoteRepository
    {
        private readonly ResearchHubDbContext _dbContext;

        public NoteRepository(ResearchHubDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        public Task<Note?> GetByIdAsync(Guid id) =>
        _dbContext.Notes.SingleOrDefaultAsync(n => n.Id == id);

        public async Task<IReadOnlyList<Note>> GetByPaperIdAsync(Guid paperId) =>
            await _dbContext.Notes
                .Where(n => n.PaperId == paperId)
                .OrderBy(n => n.CreatedAt)
                .ToListAsync();

        public Task AddAsync(Note note)
        {
            _dbContext.Notes.Add(note);
            return Task.CompletedTask;
        }

        public void Remove(Note note)
        {
            _dbContext.Notes.Remove(note);
        }
    }
}