using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ResearchHub.Domain.Entities;

namespace ResearchHub.Infrastructure.Persistence.Configurations
{
    public class ProjectMemberConfiguration : IEntityTypeConfiguration<ProjectMember>
    {
        public void Configure(EntityTypeBuilder<ProjectMember> builder)
        {
            builder.ToTable("ProjectMembers");
            builder.HasKey(m => m.Id);
            
            builder.Property(m => m.ProjectRole)
            .HasConversion<string>()
            .HasMaxLength(20);

            builder.Property(m => m.JoinedAt)
                .IsRequired();

            builder.HasIndex(m => new { m.ProjectId, m.UserId })
                .IsUnique();

            builder.HasOne<User>()
                .WithMany()
                .HasForeignKey(m => m.UserId)
                .OnDelete(DeleteBehavior.Restrict);
        }
    }
}