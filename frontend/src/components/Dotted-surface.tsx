import { cn } from "../lib/utils";
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

type DottedSurfaceProps = Omit<React.ComponentProps<'div'>, 'ref'>;

export function DottedSurface({ className, ...props }: DottedSurfaceProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const countRef = useRef<number>(0);

	useEffect(() => {
		if (!containerRef.current) return;
		const container = containerRef.current;

		const SEPARATION = 150;
		const AMOUNTX = 40;
		const AMOUNTY = 60;

		// Scene setup
		const scene = new THREE.Scene();
		scene.fog = new THREE.Fog(0xffffff, 2000, 10000);

		const camera = new THREE.PerspectiveCamera(
			60,
			window.innerWidth / window.innerHeight,
			1,
			10000,
		);
		camera.position.set(0, 355, 1220);

		const renderer = new THREE.WebGLRenderer({
			alpha: true,
			antialias: true,
		});
		renderer.setPixelRatio(window.devicePixelRatio);
		renderer.setSize(window.innerWidth, window.innerHeight);
		renderer.setClearColor(scene.fog.color, 0);

		container.appendChild(renderer.domElement);

		// Theme detection
		const bgColor = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
		const isDark = bgColor === '#16171d' || bgColor === '#1a1a1a' || bgColor === '#16171d';

		// Create particles
		const positions: number[] = [];
		const colors: number[] = [];

		// Create geometry for all particles
		const geometry = new THREE.BufferGeometry();

		for (let ix = 0; ix < AMOUNTX; ix++) {
			for (let iy = 0; iy < AMOUNTY; iy++) {
				const x = ix * SEPARATION - (AMOUNTX * SEPARATION) / 2;
				const y = 0; // Will be animated
				const z = iy * SEPARATION - (AMOUNTY * SEPARATION) / 2;

				positions.push(x, y, z);
				if (isDark) {
					colors.push(200, 200, 200);
				} else {
					colors.push(30, 30, 30);
				}
			}
		}

		geometry.setAttribute(
			'position',
			new THREE.Float32BufferAttribute(positions, 3),
		);
		geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

		// Create material
		const material = new THREE.PointsMaterial({
			size: 8,
			vertexColors: true,
			transparent: true,
			opacity: 0.8,
			sizeAttenuation: true,
		});

		// Create points object
		const points = new THREE.Points(geometry, material);
		scene.add(points);

		let animationId = 0;

		// Animation function
		const animate = () => {
			animationId = requestAnimationFrame(animate);

			const positionAttribute = geometry.attributes.position as THREE.BufferAttribute;
			const positions = positionAttribute.array as Float32Array;

			let i = 0;
			for (let ix = 0; ix < AMOUNTX; ix++) {
				for (let iy = 0; iy < AMOUNTY; iy++) {
					const index = i * 3;

					// Animate Y position with sine waves
					positions[index + 1] =
						Math.sin((ix + countRef.current) * 0.3) * 50 +
						Math.sin((iy + countRef.current) * 0.5) * 50;

					i++;
				}
			}

			positionAttribute.needsUpdate = true;
			renderer.render(scene, camera);
			countRef.current += 0.1;
		};

		// Handle window resize
		const handleResize = () => {
			if (camera && renderer) {
				camera.aspect = window.innerWidth / window.innerHeight;
				camera.updateProjectionMatrix();
				renderer.setSize(window.innerWidth, window.innerHeight);
			}
		};

		window.addEventListener('resize', handleResize);

		// Start animation
		animate();

		// Cleanup function
		return () => {
			window.removeEventListener('resize', handleResize);
			cancelAnimationFrame(animationId);

			// Clean up Three.js objects
			scene.traverse((object: THREE.Object3D) => {
				if (object instanceof THREE.Points) {
					object.geometry.dispose();
					if (Array.isArray(object.material)) {
						object.material.forEach((material: THREE.Material) => material.dispose());
					} else if (object.material) {
						(object.material as THREE.Material).dispose();
					}
				}
			});

			renderer.dispose();

			if (container && renderer.domElement && container.contains(renderer.domElement)) {
				container.removeChild(renderer.domElement);
			}
		};
	}, []);

	return (
		<div
			ref={containerRef}
			className={cn('pointer-events-none fixed inset-0 -z-1', className)}
			{...props}
		/>
	);
}