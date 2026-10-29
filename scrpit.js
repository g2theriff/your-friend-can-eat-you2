package com.kindo.eater;

import net.fabricmc.api.ClientModInitializer;
import net.fabricmc.fabric.api.client.event.lifecycle.v1.ClientTickEvents;
import net.fabricmc.fabric.api.client.rendering.v1.HudRenderCallback;
import net.minecraft.client.MinecraftClient;
import net.minecraft.client.gui.DrawContext;
import net.minecraft.client.network.ClientPlayerEntity;
import net.minecraft.entity.Entity;
import net.minecraft.entity.player.PlayerEntity;
import net.minecraft.item.ItemStack;
import net.minecraft.text.Text;
import net.minecraft.util.hit.EntityHitResult;
import net.minecraft.util.math.MathHelper;
import net.minecraft.util.math.Vec3d;
import net.minecraft.util.particle.ParticleTypes;
import java.awt.Color;
import java.util.Random;

public class EaterMod implements ClientModInitializer {
    private final Random random = new Random();
    private boolean isEating = false;
    private double eatStartTime = 0.0;
    private PlayerEntity targetPlayer = null;
    private final double eatDuration = 3.0; // seconds
    private double lastParticleTime = 0.0;
    private double lastEmojiTime = 0.0;
    private String currentEmoji = "";

    @Override
    public void onInitializeClient() {
        // Initialize items
        ModItems.initialize();

        ClientTickEvents.END_CLIENT_TICK.register(this::onTick);
        HudRenderCallback.register(this::onHudRender);
    }

    private void onTick(MinecraftClient client) {
    ClientPlayerEntity player = client.player;
    if (player == null || client.world == null) return;

    // Check if player is holding the GoofyMaw
    ItemStack mainHand = player.getMainHandStack();
    boolean isHoldingMaw = mainHand.getItem() == ModItems.GOOFY_MAW;

    // Check if player is right-clicking a player entity while holding the Maw
    if (!isEating && isHoldingMaw) {
    var crosshairTarget = client.crosshairTarget;
    if (crosshairTarget instanceof EntityHitResult entityHitResult) {
    Entity entity = entityHitResult.getEntity();
    if (entity instanceof PlayerEntity target && target != player) {
    // Trigger eating if right-clicking (use key)
    if (client.options.useKey.isPressed()) {
    isEating = true;
    eatStartTime = client.inGameHud.getDebugHud().getFrameTime();
    targetPlayer = target;
}
}
}
}

// Cancel eating if player drops the Maw or switches items
if (isEating && !isHoldingMaw) {
    isEating = false;
    targetPlayer = null;
    currentEmoji = "";
}

if (!isEating || targetPlayer == null) return;

PlayerEntity target = targetPlayer;
if (!target.isAlive()) {
    isEating = false;
    targetPlayer = null;
    return;
}

// Calculate progress based on real time
double currentTime = client.inGameHud.getDebugHud().getFrameTime();
double elapsed = currentTime - eatStartTime;
double progress = MathHelper.clamp(elapsed / eatDuration, 0.0, 1.0);

// Lazy, wobbly movement toward target
Vec3d playerPos = player.getPos();
Vec3d targetPos = target.getPos();
Vec3d direction = targetPos.subtract(playerPos).setY(0.0).normalize();

if (direction.lengthSquared() > 0.01) {
    // Wobble logic
    double wobble = Math.sin(elapsed * 2.0) * 0.1;
    Vec3d wobbleVector = new Vec3d(direction.z * wobble, 0.0, -direction.x * wobble);

    // Lazy speed: oscillates between slow and slightly faster
    double lazySpeed = 0.5 + Math.sin(elapsed * 1.5) * 0.3;
    Vec3d lazyStep = direction.multiply(lazySpeed).add(wobbleVector);

    // Apply movement
    double newX = playerPos.x + lazyStep.x * 0.05;
    double newZ = playerPos.z + lazyStep.z * 0.05;
    player.setVelocity(player.getVelocity().multiply(0.9).add(lazyStep.x * 0.1, 0, lazyStep.z * 0.1));

    // Force position update for "lazy" feel
    if (random.nextBoolean()) {
        player.setPosition(newX, playerPos.y, newZ);
    }
}

// Goofy head tilt
float yawOscillation = (float) (Math.sin(elapsed * 3.0) * 10.0);
float pitchOscillation = (float) (Math.sin(elapsed * 2.0) * 15.0);

// Modify rotation directly for the goofy effect
player.yaw += yawOscillation * 0.05f;
player.pitch = MathHelper.clamp(player.pitch + pitchOscillation * 0.05f, -90f, 90f);

// Particle effects (throttled)
if (elapsed - lastParticleTime > 0.1) {
    lastParticleTime = elapsed;
    int particleCount = (int) (progress * 8);
    for (int i = 0; i < particleCount; i++)