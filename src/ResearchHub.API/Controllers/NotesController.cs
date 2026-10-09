using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ResearchHub.Application.Notes;

namespace ResearchHub.API.Controllers
{

    [Authorize]
    [Route("api")]
    public class NotesController : ApiControllerBase
    {
        private readonly NoteService _noteService;

        public NotesController(NoteService noteService)
        {
            _noteService = noteService;
        }
        
        [HttpPost("papers/{paperId:guid}/notes")]
        public async Task<ActionResult<NoteDto>> Create(Guid paperId, CreateNoteRequest request)
        {
            var result = await _noteService.CreateAsync(paperId, request, CurrentUserId);
            return CreatedAtAction(nameof(GetByPaper), new { paperId }, result);
        }

        [HttpGet("papers/{paperId:guid}/notes")]
        public async Task<ActionResult<IReadOnlyList<NoteDto>>> GetByPaper(Guid paperId)
        {
            var result = await _noteService.GetByPaperIdAsync(paperId, CurrentUserId);
            return Ok(result);
        }

        [HttpPut("notes/{id:guid}")]
        public async Task<ActionResult<NoteDto>> Update(Guid id, UpdateNoteRequest request)
        {
            var result = await _noteService.UpdateAsync(id, request, CurrentUserId);
            return Ok(result);
        }

        [HttpDelete("notes/{id:guid}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            await _noteService.DeleteAsync(id, CurrentUserId);
            return NoContent();
        }
    }
}