using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ResearchHub.Application.ResearchTasks;

namespace ResearchHub.API.Controllers;
[Authorize]
[Route("api")]
public class TasksController : ApiControllerBase
{
    private readonly ResearchTaskService _taskService;

    public TasksController(ResearchTaskService taskService)
    {
        _taskService = taskService;
    }

    [HttpPost("projects/{projectId:guid}/tasks")]
    public async Task<ActionResult<ResearchTaskDto>> Create(Guid projectId, CreateResearchTaskRequest request)
    {
        var result = await _taskService.CreateAsync(projectId, request, CurrentUserId);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    [HttpGet("projects/{projectId:guid}/tasks")]
    public async Task<ActionResult<IReadOnlyList<ResearchTaskDto>>> GetByProject(Guid projectId)
    {
        var result = await _taskService.GetByProjectIdAsync(projectId, CurrentUserId);
        return Ok(result);
    }

    [HttpGet("tasks/{id:guid}")]
    public async Task<ActionResult<ResearchTaskDto>> GetById(Guid id)
    {
        var result = await _taskService.GetByIdAsync(id, CurrentUserId);
        return Ok(result);
    }

    [HttpPut("tasks/{id:guid}")]
    public async Task<ActionResult<ResearchTaskDto>> Update(Guid id, UpdateResearchTaskRequest request)
    {
        var result = await _taskService.UpdateAsync(id, request, CurrentUserId);
        return Ok(result);
    }

    [HttpDelete("tasks/{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        await _taskService.DeleteAsync(id, CurrentUserId);
        return NoContent();
    }

    [HttpPut("tasks/{id:guid}/assignee")]
    public async Task<ActionResult<ResearchTaskDto>> Assign(Guid id, AssignResearchTaskRequest request)
    {
        var result = await _taskService.AssignAsync(id, request, CurrentUserId);
        return Ok(result);
    }

    [HttpPatch("tasks/{id:guid}/status")]
    public async Task<ActionResult<ResearchTaskDto>> ChangeStatus(Guid id, ChangeResearchTaskStatusRequest request)
    {
        var result = await _taskService.ChangeStatusAsync(id, request, CurrentUserId);
        return Ok(result);
    }
}