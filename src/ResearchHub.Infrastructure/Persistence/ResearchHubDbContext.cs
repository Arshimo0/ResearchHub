using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using ResearchHub.Domain.Entities;

namespace ResearchHub.Infrastructure.Persistence
{
    public class ResearchHubDbContext : DbContext
    {
        public ResearchHubDbContext(DbContextOptions<ResearchHubDbContext> options)
        : base(options)
        {}
        public DbSet<User> Users => Set<User>();
        public DbSet<ResearchProject> ResearchProjects => Set<ResearchProject>();
        public DbSet<ProjectMember> ProjectMembers => Set<ProjectMember>();
        public DbSet<ResearchPaper> ResearchPapers => Set<ResearchPaper>();
        public DbSet<Note> Notes => Set<Note>();
        public DbSet<Tag> Tags => Set<Tag>();
        public DbSet<ResearchTask> ResearchTasks => Set<ResearchTask>();

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.ApplyConfigurationsFromAssembly(typeof(ResearchHubDbContext).Assembly);
            base.OnModelCreating(modelBuilder);
        }
    }
}