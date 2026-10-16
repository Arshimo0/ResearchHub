using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using FluentValidation;

namespace ResearchHub.Application.Papers;

public class CreatePaperRequestValidator : AbstractValidator<CreatePaperRequest>
{
    public CreatePaperRequestValidator()
    {
        RuleLevelCascadeMode = CascadeMode.Stop;

        RuleFor(x => x.Title).NotEmpty().MaximumLength(500);
        RuleFor(x => x.Authors).MaximumLength(1000);
        RuleFor(x => x.Abstract).MaximumLength(4000);
        RuleFor(x => x.DoiOrUrl).MaximumLength(500);
        RuleFor(x => x.PdfReference).MaximumLength(500);

        RuleFor(x => x.Tags)
            .Must(tags => tags is null || tags.Count <= 20)
            .WithMessage("A paper can have at most 20 tags.");

        RuleForEach(x => x.Tags).NotEmpty().MaximumLength(100);
    }
}

public class UpdatePaperRequestValidator : AbstractValidator<UpdatePaperRequest>
{
    public UpdatePaperRequestValidator()
    {
        RuleLevelCascadeMode = CascadeMode.Stop;

        RuleFor(x => x.Title).NotEmpty().MaximumLength(500);
        RuleFor(x => x.Authors).MaximumLength(1000);
        RuleFor(x => x.Abstract).MaximumLength(4000);
        RuleFor(x => x.DoiOrUrl).MaximumLength(500);
        RuleFor(x => x.PdfReference).MaximumLength(500);
    }
}

public class AddTagRequestValidator : AbstractValidator<AddTagRequest>
{
    public AddTagRequestValidator()
    {
        RuleLevelCascadeMode = CascadeMode.Stop;

        RuleFor(x => x.Name).NotEmpty().MaximumLength(100);
    }
}