import Foundation
#if canImport(FoundationModels)
import FoundationModels
#endif

struct JamIdeaRequest {
    let style: String
    let styleDescription: String
    let key: String
    let mode: String
    let meter: String
    let tonic: String
    let bpmMin: Int
    let bpmMax: Int
    /// Chord symbols the app can voice in this key; the model may only pick from these.
    let palette: [String]
    /// Recent progressions ("Am F C G") to steer away from.
    let avoid: [String]
    /// Optional description of a YouTube channel whose backing tracks the user wants to sound like.
    let inspiration: String?
}

struct ChannelStyleRequest {
    let channel: String
    let titles: [String]
    /// The video the user pasted (title and description), weighted above the rest of the channel.
    let focus: String?
    /// The jam's style ids ("rock", "slowblues", …) with a short description of each.
    let styles: [(id: String, description: String)]
}

/// Writes a backing-track idea with the on-device Apple Intelligence model.
@available(iOS 26.0, *)
enum JamIdeaGenerator {
    static func status() -> [String: Any] {
        #if canImport(FoundationModels)
        switch SystemLanguageModel.default.availability {
        case .available:
            return ["available": true]
        case .unavailable(.deviceNotEligible):
            return ["available": false, "reason": "deviceNotEligible"]
        case .unavailable(.appleIntelligenceNotEnabled):
            return ["available": false, "reason": "appleIntelligenceNotEnabled"]
        case .unavailable(.modelNotReady):
            return ["available": false, "reason": "modelNotReady"]
        case .unavailable:
            return ["available": false, "reason": "unknown"]
        }
        #else
        return ["available": false, "reason": "osTooOld"]
        #endif
    }

    static func generate(_ req: JamIdeaRequest) async throws -> [String: Any] {
        #if canImport(FoundationModels)
        guard !req.palette.isEmpty else { throw GeneratorError.noChords }
        let chord = DynamicGenerationSchema(name: "Chord", anyOf: req.palette)
        let idea = DynamicGenerationSchema(name: "JamIdea", properties: [
            .init(name: "title", description: "A short evocative name for the jam, 2 to 4 words",
                  schema: DynamicGenerationSchema(type: String.self)),
            .init(name: "chords", description: "The progression, one chord per bar, in playing order",
                  schema: DynamicGenerationSchema(arrayOf: DynamicGenerationSchema(referenceTo: "Chord"),
                                                  minimumElements: 4, maximumElements: 8)),
            .init(name: "bpm", description: "Tempo in beats per minute that suits the feel",
                  schema: DynamicGenerationSchema(type: Int.self, guides: [.range(req.bpmMin...req.bpmMax)])),
            .init(name: "soloTip", description: "One practical sentence on what to target when soloing over it",
                  schema: DynamicGenerationSchema(type: String.self)),
        ])
        let schema = try GenerationSchema(root: idea, dependencies: [chord])

        let session = LanguageModelSession(instructions: """
            You are a session musician who writes backing-track chord progressions for guitarists \
            to practise improvising over. Write progressions that sound idiomatic for the requested \
            style, resolve convincingly, and loop smoothly back to the first chord. Keep the title \
            short and the solo tip to one concrete sentence about notes, scales or chord tones.
            """)

        var prompt = """
            Write a fresh \(req.style) backing track in \(req.key) \(req.mode), \(req.meter) time.
            Style notes: \(req.styleDescription)
            Use 4 to 8 bars, one chord per bar. Start on or resolve to \(req.tonic).
            Tempo between \(req.bpmMin) and \(req.bpmMax) BPM.
            """
        if let inspiration = req.inspiration, !inspiration.isEmpty {
            prompt += "\nMake it sound like this YouTube channel's backing tracks: \(inspiration)"
        }
        if !req.avoid.isEmpty {
            prompt += "\nDon't repeat these recent progressions: \(req.avoid.joined(separator: "; "))."
        }

        let response = try await session.respond(
            to: prompt,
            schema: schema,
            includeSchemaInPrompt: true,
            options: GenerationOptions(temperature: 1.0)
        )
        let content = response.content
        return [
            "title": try content.value(String.self, forProperty: "title"),
            "chords": try content.value([String].self, forProperty: "chords"),
            "bpm": try content.value(Int.self, forProperty: "bpm"),
            "soloTip": try content.value(String.self, forProperty: "soloTip"),
        ]
        #else
        throw GeneratorError.unavailable
        #endif
    }

    /// Reads a channel's video titles and describes its backing tracks in terms of the jam's styles.
    static func analyzeChannel(_ req: ChannelStyleRequest) async throws -> [String: Any] {
        #if canImport(FoundationModels)
        guard !req.titles.isEmpty, !req.styles.isEmpty else { throw GeneratorError.noTitles }
        let styleId = DynamicGenerationSchema(name: "StyleId", anyOf: req.styles.map(\.id))
        let mode = DynamicGenerationSchema(name: "Mode", anyOf: ["major", "minor", "both"])
        let profile = DynamicGenerationSchema(name: "ChannelStyle", properties: [
            .init(name: "styles", description: "The 1 to 3 jam styles that best match the channel's backing tracks, best first",
                  schema: DynamicGenerationSchema(arrayOf: DynamicGenerationSchema(referenceTo: "StyleId"),
                                                  minimumElements: 1, maximumElements: 3)),
            .init(name: "mode", description: "Whether the tracks are mostly major, minor or both",
                  schema: DynamicGenerationSchema(referenceTo: "Mode")),
            .init(name: "tempoMin", description: "Slowest typical tempo in BPM",
                  schema: DynamicGenerationSchema(type: Int.self, guides: [.range(40...240)])),
            .init(name: "tempoMax", description: "Fastest typical tempo in BPM",
                  schema: DynamicGenerationSchema(type: Int.self, guides: [.range(40...240)])),
            .init(name: "mood", description: "A few words for the mood and production, e.g. 'smoky, late-night, soulful'",
                  schema: DynamicGenerationSchema(type: String.self)),
            .init(name: "harmony", description: "One sentence on typical chords and progressions, e.g. 'minor ii-V turnarounds with 9th chords'",
                  schema: DynamicGenerationSchema(type: String.self)),
            .init(name: "summary", description: "One friendly sentence describing the channel's backing tracks",
                  schema: DynamicGenerationSchema(type: String.self)),
        ])
        let schema = try GenerationSchema(root: profile, dependencies: [styleId, mode])

        let session = LanguageModelSession(instructions: """
            You are a music producer who analyses YouTube backing-track channels. From video titles, \
            infer the genres, tempos, keys, moods and harmony the channel usually makes. Titles often \
            name the style, key and BPM. Map the genres onto the closest available jam styles.
            """)
        let styleList = req.styles.map { "- \($0.id): \($0.description)" }.joined(separator: "\n")
        let titles = req.titles.prefix(40).map { "- \($0)" }.joined(separator: "\n")
        let focus = req.focus.map { "The user wants tracks most like this video: \($0)\n" } ?? ""
        let prompt = """
            Channel: \(req.channel)
            \(focus)Recent video titles:
            \(titles)

            Available jam styles:
            \(styleList)
            """
        let response = try await session.respond(
            to: prompt,
            schema: schema,
            includeSchemaInPrompt: true,
            options: GenerationOptions(temperature: 0.3)
        )
        let content = response.content
        let lo = try content.value(Int.self, forProperty: "tempoMin")
        let hi = try content.value(Int.self, forProperty: "tempoMax")
        return [
            "styles": try content.value([String].self, forProperty: "styles"),
            "mode": try content.value(String.self, forProperty: "mode"),
            "tempoMin": min(lo, hi),
            "tempoMax": max(lo, hi),
            "mood": try content.value(String.self, forProperty: "mood"),
            "harmony": try content.value(String.self, forProperty: "harmony"),
            "summary": try content.value(String.self, forProperty: "summary"),
        ]
        #else
        throw GeneratorError.unavailable
        #endif
    }

    enum GeneratorError: LocalizedError {
        case noChords, noTitles, unavailable
        var errorDescription: String? {
            switch self {
            case .noChords: return "No chords to choose from"
            case .noTitles: return "No videos to learn from"
            case .unavailable: return "Apple Intelligence isn't available"
            }
        }
    }
}
