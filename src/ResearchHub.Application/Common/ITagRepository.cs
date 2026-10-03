using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using ResearchHub.Domain.Entities;

namespace ResearchHub.Application.Common
{
    public interface ITagRepository
    {
        Task<Tag?> GetByProjectIdAndNameAsync(Guid projectId, string name);
        Task AddAsync(Tag tag);
    }
}