using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ResearchHub.Domain.Entities;

namespace ResearchHub.Infrastructure.Persistence.Configurations
{
    public class ResearchProjectConfiguration : IEntityTypeConfiguration<ResearchProject>
    {
        public void Configure(EntityTypeBuilder<ResearchProject> builder)
            {
                builder.ToTable("ResearchProjects");

                builder.HasKey(p => p.Id);

                builder.Property(p => p.Name)
                    .IsRequired()
                    .HasMaxLength(200);

                builder.Property(p => p.Description)
                    .HasMaxLength(2000);

                builder.Property(p => p.Status)
                    .HasConversion<string>()
                    .HasMaxLength(20);

                builder.Property(p => p.CreatedAt)
                    .IsRequired();

                builder.Metadata
                    .FindNavigation(nameof(ResearchProject.Members))!
                    .SetPropertyAccessMode(PropertyAccessMode.Field);

                builder.HasMany(p => p.Members)
                    .WithOne()
                    .HasForeignKey(m => m.ProjectId)
                    .OnDelete(DeleteBehavior.Cascade);
            }
    }
}