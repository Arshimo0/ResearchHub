using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using FluentValidation;

namespace ResearchHub.Application.ResearchTasks;

public class CreateResearchTaskRequestValidator : AbstractValidator<CreateResearchTaskRequest>
{
    public CreateResearchTaskRequestValidator()
    {
        RuleLevelCascadeMode = CascadeMode.Stop;

        RuleFor(x => x.Title).NotEmpty().MaximumLength(300);
        RuleFor(x => x.Description).MaximumLength(2000);
        RuleFor(x => x.Priority).IsInEnum();
    }
}

public class UpdateResearchTaskRequestValidator : AbstractValidator<UpdateResearchTaskRequest>
{
    public UpdateResearchTaskRequestValidator()
    {
        RuleLevelCascadeMode = CascadeMode.Stop;

        RuleFor(x => x.Title).NotEmpty().MaximumLength(300);
        RuleFor(x => x.Description).MaximumLength(2000);
        RuleFor(x => x.Priority).IsInEnum();
    }
}

public class ChangeResearchTaskStatusRequestValidator : AbstractValidator<ChangeResearchTaskStatusRequest>
{
    public ChangeResearchTaskStatusRequestValidator()
    {
        RuleFor(x => x.Status).IsInEnum();
    }
}