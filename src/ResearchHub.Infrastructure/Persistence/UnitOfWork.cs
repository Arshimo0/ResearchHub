using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using ResearchHub.Application.Common;

namespace ResearchHub.Infrastructure.Persistence
{
    public class UnitOfWork: IUnitOfWork
    {
        private readonly ResearchHubDbContext _dbContext;

        public UnitOfWork(ResearchHubDbContext dbContext)
        {
            _dbContext = dbContext;
        }
        public Task SaveChangesAsync() => _dbContext.SaveChangesAsync();
    }
}