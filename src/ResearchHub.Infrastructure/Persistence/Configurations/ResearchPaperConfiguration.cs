using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ResearchHub.Domain.Entities;

namespace ResearchHub.Infrastructure.Persistence.Configurations
{
    public class ResearchPaperConfiguration: IEntityTypeConfiguration<ResearchPaper>
    {
        public void Configure(EntityTypeBuilder<ResearchPaper> builder)
        {
            builder.ToTable("ResearchPapers");

            builder.HasKey(p => p.Id);

            builder.Property(p => p.Title)
                .IsRequired()
                .HasMaxLength(500);

            builder.Property(p => p.Authors)
                .HasMaxLength(1000);

            builder.Property(p => p.Abstract)
                .HasMaxLength(4000);

            builder.Property(p => p.DoiOrUrl)
                .HasMaxLength(500);

            builder.Property(p => p.PdfReference)
                .HasMaxLength(500);

            builder.Property(p => p.CreatedAt)
                .IsRequired();

            builder.HasIndex(p => p.ProjectId);
            builder.HasIndex(p => p.PublicationDate);

            builder.Metadata
                .FindNavigation(nameof(ResearchPaper.Tags))!
                .SetPropertyAccessMode(PropertyAccessMode.Field);

            builder.HasMany(p => p.Tags)
                .WithMany()
                .UsingEntity(j => j.ToTable("PaperTags"));

            builder.HasOne<User>()
                .WithMany()
                .HasForeignKey(p => p.AddedByUserId)
                .OnDelete(DeleteBehavior.Restrict);
        }
    }
}