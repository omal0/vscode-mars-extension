interface MarsLaunchRequestArguments extends DebugProtocol.LaunchRequestArguments {
	program: string;
}

import {
	DebugSession,
	InitializedEvent,
	StoppedEvent,
	Thread,
	StackFrame,
	Scope,
	Source,
	Handles
} from '@vscode/debugadapter';

import * as path from 'path';
import { DebugProtocol } from '@vscode/debugprotocol';

class MarsDebugSession extends DebugSession {
	private variableHandles = new Handles<string>();
    private programPath?: string;
    private currentLine = 1;

	public constructor() {
		super();
		this.setDebuggerLinesStartAt1(true);
		this.setDebuggerColumnsStartAt1(true);
	}

    protected nextRequest(response: DebugProtocol.NextResponse): void {
        this.currentLine += 1;
    
        this.sendResponse(response);
        this.sendEvent(new StoppedEvent('step', 1));
    }
    
    protected stepInRequest(response: DebugProtocol.StepInResponse): void {
        this.currentLine += 1;
    
        this.sendResponse(response);
        this.sendEvent(new StoppedEvent('step', 1));
    }
    
    protected stepOutRequest(response: DebugProtocol.StepOutResponse): void {
        this.currentLine += 1;
    
        this.sendResponse(response);
        this.sendEvent(new StoppedEvent('step', 1));
    }
    
    protected continueRequest(response: DebugProtocol.ContinueResponse): void {
        response.body = {
            allThreadsContinued: false
        };
    
        this.sendResponse(response);
        this.sendEvent(new StoppedEvent('pause', 1));
    }
    
    protected pauseRequest(response: DebugProtocol.PauseResponse): void {
        this.sendResponse(response);
        this.sendEvent(new StoppedEvent('pause', 1));
    }
    
    protected disconnectRequest(response: DebugProtocol.DisconnectResponse): void {
        this.sendResponse(response);
    }

	protected initializeRequest(
		response: DebugProtocol.InitializeResponse,
		args: DebugProtocol.InitializeRequestArguments
	): void {
		response.body = {
			supportsConfigurationDoneRequest: true,
			supportsEvaluateForHovers: false,
			supportsStepBack: false,
			supportsSetVariable: false,
			supportsRestartRequest: false
		};

		this.sendResponse(response);
		this.sendEvent(new InitializedEvent());
	}

    protected launchRequest(
        response: DebugProtocol.LaunchResponse,
        args: MarsLaunchRequestArguments
    ): void {
        this.programPath = args.program;
        this.currentLine = 1;
    
        this.sendResponse(response);
        this.sendEvent(new StoppedEvent('entry', 1));
    }

	protected configurationDoneRequest(
		response: DebugProtocol.ConfigurationDoneResponse,
		args: DebugProtocol.ConfigurationDoneArguments
	): void {
		this.sendResponse(response);
	}

	protected threadsRequest(response: DebugProtocol.ThreadsResponse): void {
		response.body = {
			threads: [
				new Thread(1, 'MARS Program')
			]
		};

		this.sendResponse(response);
	}

    protected stackTraceRequest(
        response: DebugProtocol.StackTraceResponse,
        args: DebugProtocol.StackTraceArguments
    ): void {
        const source = this.programPath
            ? new Source(path.basename(this.programPath), this.programPath)
            : undefined;
    
        response.body = {
            stackFrames: [
                new StackFrame(
                    1,
                    'main',
                    source,
                    this.currentLine,
                    1
                )
            ],
            totalFrames: 1
        };
    
        this.sendResponse(response);
    }

	protected scopesRequest(
		response: DebugProtocol.ScopesResponse,
		args: DebugProtocol.ScopesArguments
	): void {
		const registersHandle = this.variableHandles.create('registers');
		const memoryHandle = this.variableHandles.create('memory');

		response.body = {
			scopes: [
				new Scope('Registers', registersHandle, false),
				new Scope('Memory', memoryHandle, false)
			]
		};

		this.sendResponse(response);
	}

	protected variablesRequest(
		response: DebugProtocol.VariablesResponse,
		args: DebugProtocol.VariablesArguments
	): void {
		const kind = this.variableHandles.get(args.variablesReference);

		if (kind === 'registers') {
			response.body = {
				variables: [
					{ name: '$t0', value: '0', variablesReference: 0 },
					{ name: '$t1', value: '100', variablesReference: 0 },
					{ name: '$t2', value: '100', variablesReference: 0 },
					{ name: '$t3', value: '5050', variablesReference: 0 }
				]
			};
		} else if (kind === 'memory') {
			response.body = {
				variables: [
					{ name: '0x10010000', value: '0x00000000', variablesReference: 0 },
					{ name: '0x10010004', value: '0x00000000', variablesReference: 0 }
				]
			};
		} else {
			response.body = {
				variables: []
			};
		}

		this.sendResponse(response);
	}
}

DebugSession.run(MarsDebugSession);