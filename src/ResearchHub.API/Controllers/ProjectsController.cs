using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ResearchHub.Application.Projects;

namespace ResearchHub.API.Controllers;

[Authorize]
[Route("api/projects")]
public class ProjectsController : ApiControllerBase
{
    private readonly ProjectService _projectService;

    public ProjectsController(ProjectService projectService)
    {
        _projectService = projectService;
    }
    [HttpPost]
    public async Task<ActionResult<ProjectDto>> Create(CreateProjectRequest request)
    {
        var result = await _projectService.CreateAsync(request, CurrentUserId);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    
    }
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ProjectDto>> GetById(Guid id)
    {
        var result = await _projectService.GetByIdAsync(id, CurrentUserId);
        return Ok(result);
    }
        [HttpPut("{id:guid}")]
    public async Task<ActionResult<ProjectDto>> Update(Guid id, UpdateProjectRequest request)
    {
        var result = await _projectService.UpdateAsync(id, request, CurrentUserId);
        return Ok(result);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        await _projectService.DeleteAsync(id, CurrentUserId);
        return NoContent();
    }
        [HttpPost("{id:guid}/members")]
    public async Task<ActionResult<ProjectDto>> AddMember(Guid id, AddMemberRequest request)
    {
        var result = await _projectService.AddMemberAsync(id, request, CurrentUserId);
        return Ok(result);
    }

    [HttpDelete("{id:guid}/members/{userId:guid}")]
    public async Task<ActionResult<ProjectDto>> RemoveMember(Guid id, Guid userId)
    {
        var result = await _projectService.RemoveMemberAsync(id, userId, CurrentUserId);
        return Ok(result);
    }
}
