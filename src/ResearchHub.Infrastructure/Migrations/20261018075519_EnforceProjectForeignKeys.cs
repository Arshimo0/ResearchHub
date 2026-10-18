using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ResearchHub.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class EnforceProjectForeignKeys : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddForeignKey(
                name: "FK_ResearchPapers_ResearchProjects_ProjectId",
                table: "ResearchPapers",
                column: "ProjectId",
                principalTable: "ResearchProjects",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_ResearchTasks_ResearchProjects_ProjectId",
                table: "ResearchTasks",
                column: "ProjectId",
                principalTable: "ResearchProjects",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Tags_ResearchProjects_ProjectId",
                table: "Tags",
                column: "ProjectId",
                principalTable: "ResearchProjects",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ResearchPapers_ResearchProjects_ProjectId",
                table: "ResearchPapers");

            migrationBuilder.DropForeignKey(
                name: "FK_ResearchTasks_ResearchProjects_ProjectId",
                table: "ResearchTasks");

            migrationBuilder.DropForeignKey(
                name: "FK_Tags_ResearchProjects_ProjectId",
                table: "Tags");
        }
    }
}
