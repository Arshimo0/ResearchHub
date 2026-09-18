using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ResearchHub.Domain.Entities;

namespace ResearchHub.Infrastructure.Persistence.Configurations
{
    public class ResearchTaskConfiguration : IEntityTypeConfiguration<ResearchTask>
    {
        public void Configure(EntityTypeBuilder<ResearchTask> builder)
        {
            builder.ToTable("ResearchTasks");

            builder.HasKey(t => t.Id);

            builder.Property(t => t.Title)
                .IsRequired()
                .HasMaxLength(300);

            builder.Property(t => t.Description)
                .HasMaxLength(2000);

            builder.Property(t => t.Status)
                .HasConversion<string>()
                .HasMaxLength(20);

            builder.Property(t => t.Priority)
                .HasConversion<string>()
                .HasMaxLength(20);

            builder.Property(t => t.CreatedAt)
                .IsRequired();

            builder.HasIndex(t => t.ProjectId);
            builder.HasIndex(t => t.AssignedToUserId);

            builder.HasOne<User>()
                .WithMany()
                .HasForeignKey(t => t.CreatedByUserId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.HasOne<User>()
                .WithMany()
                .HasForeignKey(t => t.AssignedToUserId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.HasOne<ResearchPaper>()
                .WithMany()
                .HasForeignKey(t => t.PaperId)
                .OnDelete(DeleteBehavior.SetNull);
        }
    }
}