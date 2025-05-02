"use strict";
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreatorDto = void 0;
var swagger_1 = require("@nestjs/swagger");
var CreatorDto = function () {
    var _a;
    var _creatorId_decorators;
    var _creatorId_initializers = [];
    var _creatorId_extraInitializers = [];
    var _agentCount_decorators;
    var _agentCount_initializers = [];
    var _agentCount_extraInitializers = [];
    return _a = /** @class */ (function () {
            function CreatorDto() {
                this.creatorId = __runInitializers(this, _creatorId_initializers, void 0);
                this.agentCount = (__runInitializers(this, _creatorId_extraInitializers), __runInitializers(this, _agentCount_initializers, void 0));
                __runInitializers(this, _agentCount_extraInitializers);
            }
            return CreatorDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _creatorId_decorators = [(0, swagger_1.ApiProperty)({
                    example: '0x123abc...',
                    description: 'The creator ID (wallet address that created the agent)',
                })];
            _agentCount_decorators = [(0, swagger_1.ApiProperty)({
                    example: 5,
                    description: 'Number of agents created by this creator',
                })];
            __esDecorate(null, null, _creatorId_decorators, { kind: "field", name: "creatorId", static: false, private: false, access: { has: function (obj) { return "creatorId" in obj; }, get: function (obj) { return obj.creatorId; }, set: function (obj, value) { obj.creatorId = value; } }, metadata: _metadata }, _creatorId_initializers, _creatorId_extraInitializers);
            __esDecorate(null, null, _agentCount_decorators, { kind: "field", name: "agentCount", static: false, private: false, access: { has: function (obj) { return "agentCount" in obj; }, get: function (obj) { return obj.agentCount; }, set: function (obj, value) { obj.agentCount = value; } }, metadata: _metadata }, _agentCount_initializers, _agentCount_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.CreatorDto = CreatorDto;
