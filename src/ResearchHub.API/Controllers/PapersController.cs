using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ResearchHub.Application.Papers;

namespace ResearchHub.API.Controllers;

[Authorize]
[Route("api")]
public class PapersController : ApiControllerBase
{
    private readonly PaperService _paperService;

    public PapersController(PaperService paperService)
    {
        _paperService = paperService;
    }

    [HttpPost("projects/{projectId:guid}/papers")]
    public async Task<ActionResult<PaperDto>> Create(Guid projectId, CreatePaperRequest request)
    {
        var result = await _paperService.CreateAsync(projectId, request, CurrentUserId);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    [HttpGet("projects/{projectId:guid}/papers")]
    public async Task<ActionResult<IReadOnlyList<PaperDto>>> GetByProject(
        Guid projectId,
        [FromQuery] string? tag,
        [FromQuery] string? author,
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to)
    {
        var filter = new PaperFilter(tag, author, from, to);
        var result = await _paperService.GetByProjectIdAsync(projectId, filter, CurrentUserId);
        return Ok(result);
    }

    [HttpGet("papers/{id:guid}")]
    public async Task<ActionResult<PaperDto>> GetById(Guid id)
    {
        var result = await _paperService.GetByIdAsync(id, CurrentUserId);
        return Ok(result);
    }

    [HttpPut("papers/{id:guid}")]
    public async Task<ActionResult<PaperDto>> Update(Guid id, UpdatePaperRequest request)
    {
        var result = await _paperService.UpdateAsync(id, request, CurrentUserId);
        return Ok(result);
    }

    [HttpDelete("papers/{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        await _paperService.DeleteAsync(id, CurrentUserId);
        return NoContent();
    }

    [HttpPost("papers/{id:guid}/tags")]
    public async Task<ActionResult<PaperDto>> AddTag(Guid id, AddTagRequest request)
    {
        var result = await _paperService.AddTagAsync(id, request.Name, CurrentUserId);
        return Ok(result);
    }

    [HttpDelete("papers/{id:guid}/tags/{tagId:guid}")]
    public async Task<ActionResult<PaperDto>> RemoveTag(Guid id, Guid tagId)
    {
        var result = await _paperService.RemoveTagAsync(id, tagId, CurrentUserId);
        return Ok(result);
    }
}
