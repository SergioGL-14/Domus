using System.Text.Json;

const long MaxProjectBytes = 30L * 1024L * 1024L;
const string ProjectFileName = "domus-project.json";

var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();
var writeLock = new SemaphoreSlim(1, 1);
var jsonWriteOptions = new JsonSerializerOptions
{
    WriteIndented = true,
};

var dataDirectory = Path.Combine(app.Environment.ContentRootPath, "App_Data");
var projectPath = Path.Combine(dataDirectory, ProjectFileName);

app.Use(async (context, next) =>
{
    context.Response.Headers["X-Content-Type-Options"] = "nosniff";
    context.Response.Headers["X-Frame-Options"] = "DENY";
    context.Response.Headers["Referrer-Policy"] = "no-referrer";
    context.Response.Headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()";

    if (context.Request.Path.StartsWithSegments("/api"))
    {
        context.Response.Headers["Cache-Control"] = "no-store";
    }

    await next();
});

app.MapGet("/api/health", () => Results.Json(new
{
    status = "ok",
    storage = "json-file",
    projectFile = Path.Combine("App_Data", ProjectFileName),
    storageReady = Directory.Exists(dataDirectory),
}));

app.MapGet("/api/project", async (CancellationToken cancellationToken) =>
{
    if (!File.Exists(projectPath))
    {
        return Results.NoContent();
    }

    var json = await File.ReadAllTextAsync(projectPath, cancellationToken);
    return Results.Content(json, "application/json");
});

app.MapPut("/api/project", async (HttpRequest request, CancellationToken cancellationToken) =>
{
    if (!IsJsonRequest(request))
    {
        return Results.BadRequest(new { error = "json-content-type-required" });
    }

    if (request.ContentLength is > MaxProjectBytes)
    {
        return ProjectTooLarge(MaxProjectBytes);
    }

    var readResult = await ReadRequestBodyAsync(request.Body, MaxProjectBytes, cancellationToken);
    if (readResult.TooLarge)
    {
        await readResult.Body.DisposeAsync();
        return ProjectTooLarge(MaxProjectBytes);
    }

    await using var buffer = readResult.Body;

    JsonDocument document;
    try
    {
        document = await JsonDocument.ParseAsync(buffer);
    }
    catch (JsonException)
    {
        return Results.BadRequest(new { error = "invalid-json" });
    }

    using (document)
    {
        if (!LooksLikeCasaBaseProject(document.RootElement))
        {
            return Results.BadRequest(new { error = "invalid-project-shape" });
        }

        var tempPath = Path.Combine(dataDirectory, $"{ProjectFileName}.{Guid.NewGuid():N}.tmp");
        await writeLock.WaitAsync(cancellationToken);
        try
        {
            Directory.CreateDirectory(dataDirectory);
            await using (var file = File.Create(tempPath))
            {
                await JsonSerializer.SerializeAsync(file, document.RootElement, jsonWriteOptions, cancellationToken);
            }

            File.Move(tempPath, projectPath, overwrite: true);
        }
        catch (Exception exception) when (exception is IOException or UnauthorizedAccessException)
        {
            return Results.Problem(
                title: "No se pudo guardar el proyecto",
                detail: "Revisa permisos de escritura del App Pool sobre App_Data.",
                statusCode: StatusCodes.Status500InternalServerError);
        }
        finally
        {
            try
            {
                if (File.Exists(tempPath))
                {
                    File.Delete(tempPath);
                }
            }
            catch (Exception exception) when (exception is IOException or UnauthorizedAccessException)
            {
                // Si no puedo borrar un temporal en este momento, prefiero no tapar el error real de guardado.
            }

            writeLock.Release();
        }
    }

    return Results.Json(new
    {
        saved = true,
        savedAt = DateTimeOffset.UtcNow,
        bytes = new FileInfo(projectPath).Length,
    });
});

app.UseDefaultFiles();
app.UseStaticFiles(new StaticFileOptions
{
    OnPrepareResponse = context =>
    {
        context.Context.Response.Headers.CacheControl = "no-cache, no-store, must-revalidate";
        context.Context.Response.Headers.Pragma = "no-cache";
        context.Context.Response.Headers.Expires = "0";
    },
});

app.MapFallbackToFile("index.html");

app.Run();

static bool LooksLikeCasaBaseProject(JsonElement root)
{
    return root.ValueKind == JsonValueKind.Object
        && root.TryGetProperty("project", out var project)
        && project.ValueKind == JsonValueKind.Object
        && root.TryGetProperty("canvas", out var canvas)
        && canvas.ValueKind == JsonValueKind.Object
        && root.TryGetProperty("floors", out var floors)
        && floors.ValueKind == JsonValueKind.Array;
}

static bool IsJsonRequest(HttpRequest request)
{
    var contentType = request.ContentType ?? "";
    return contentType.StartsWith("application/json", StringComparison.OrdinalIgnoreCase);
}

static IResult ProjectTooLarge(long maxProjectBytes)
{
    return Results.Problem(
        title: "Proyecto demasiado grande",
        detail: $"El limite actual es {maxProjectBytes / 1024 / 1024} MB.",
        statusCode: StatusCodes.Status413PayloadTooLarge);
}

static async Task<(bool TooLarge, MemoryStream Body)> ReadRequestBodyAsync(
    Stream body,
    long maxBytes,
    CancellationToken cancellationToken)
{
    var buffer = new MemoryStream();
    var chunk = new byte[81920];

    while (true)
    {
        var read = await body.ReadAsync(chunk.AsMemory(0, chunk.Length), cancellationToken);
        if (read == 0)
        {
            buffer.Position = 0;
            return (false, buffer);
        }

        if (buffer.Length + read > maxBytes)
        {
            return (true, buffer);
        }

        await buffer.WriteAsync(chunk.AsMemory(0, read), cancellationToken);
    }
}
