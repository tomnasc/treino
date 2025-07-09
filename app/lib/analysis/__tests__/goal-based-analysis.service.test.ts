import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GoalBasedAnalysisService } from '../goal-based-analysis.service'
import { 
  Workout, 
  WorkoutExercise, 
  Exercise, 
  UserAnalysisProfile, 
  FitnessGoal,
  GoalBasedAnalysis
} from '@/app/types/recommendations.types'

describe('GoalBasedAnalysisService', () => {
  let mockWorkouts: Workout[]
  let mockUserProfile: UserAnalysisProfile

  beforeEach(() => {
    mockWorkouts = [
      {
        id: '1',
        name: 'Upper Body',
        description: 'Upper body workout',
        created_by: 'user-1',
        exercises: [
          {
            id: '1',
            exercise_id: 'ex-1',
            sets: 3,
            reps: '10-12',
            rest_time: 120,
            order_position: 1,
            exercise: {
              id: 'ex-1',
              name: 'Supino Reto',
              muscle_group: { id: 'mg-1', name: 'chest' },
              description: 'Compound chest exercise'
            }
          },
          {
            id: '2',
            exercise_id: 'ex-2',
            sets: 4,
            reps: '6-8',
            rest_time: 180,
            order_position: 2,
            exercise: {
              id: 'ex-2',
              name: 'Barra Fixa',
              muscle_group: { id: 'mg-2', name: 'back' },
              description: 'Compound back exercise'
            }
          }
        ]
      }
    ]

    mockUserProfile = {
      fitness_level: 'intermediate',
      primary_goal: 'muscle_gain',
      secondary_goals: ['strength_gain'],
      available_equipment: ['barbell', 'dumbbells'],
      training_frequency: 4,
      time_per_session: 90,
      injury_history: [],
      limitations: [],
      preferences: {
        compound_vs_isolation: 0.7,
        high_vs_low_intensity: 0.5,
        volume_tolerance: 0.8,
        exercise_variety_preference: 0.6
      }
    }
  })

  describe('analyzeGoalAlignment', () => {
    it('should analyze goal alignment for muscle gain', async () => {
      const result = await GoalBasedAnalysisService.analyzeGoalAlignment(
        mockWorkouts,
        mockUserProfile
      )

      expect(result).toBeDefined()
      expect(result.goal).toBe('muscle_gain')
      expect(result.current_workout_alignment).toBeGreaterThanOrEqual(0)
      expect(result.current_workout_alignment).toBeLessThanOrEqual(1)
      expect(result.recommendations).toBeDefined()
      expect(Array.isArray(result.recommendations)).toBe(true)
    })

    it('should analyze goal alignment for strength gain', async () => {
      const strengthProfile = {
        ...mockUserProfile,
        primary_goal: 'strength_gain' as FitnessGoal
      }

      const result = await GoalBasedAnalysisService.analyzeGoalAlignment(
        mockWorkouts,
        strengthProfile
      )

      expect(result.goal).toBe('strength_gain')
      expect(result.priority_muscle_groups).toBeDefined()
      expect(result.recommended_changes).toBeDefined()
    })

    it('should analyze goal alignment for fat loss', async () => {
      const fatLossProfile = {
        ...mockUserProfile,
        primary_goal: 'fat_loss' as FitnessGoal
      }

      const result = await GoalBasedAnalysisService.analyzeGoalAlignment(
        mockWorkouts,
        fatLossProfile
      )

      expect(result.goal).toBe('fat_loss')
      expect(result.recommended_changes.rest_time_adjustment).toBeLessThan(0)
    })

    it('should handle endurance goal', async () => {
      const enduranceProfile = {
        ...mockUserProfile,
        primary_goal: 'endurance' as FitnessGoal
      }

      const result = await GoalBasedAnalysisService.analyzeGoalAlignment(
        mockWorkouts,
        enduranceProfile
      )

      expect(result.goal).toBe('endurance')
      expect(result.recommended_changes.frequency_adjustment).toBeGreaterThanOrEqual(0)
    })

    it('should handle rehabilitation goal', async () => {
      const rehabProfile = {
        ...mockUserProfile,
        primary_goal: 'rehabilitation' as FitnessGoal,
        injury_history: ['lower_back'],
        limitations: ['avoid_heavy_lifting']
      }

      const result = await GoalBasedAnalysisService.analyzeGoalAlignment(
        mockWorkouts,
        rehabProfile
      )

      expect(result.goal).toBe('rehabilitation')
      expect(result.avoid_muscle_groups).toBeDefined()
    })
  })

  describe('analyzeWorkoutForGoal', () => {
    it('should analyze workout for muscle gain goal', async () => {
      const result = await GoalBasedAnalysisService['analyzeWorkoutForGoal'](
        mockWorkouts[0],
        'muscle_gain',
        mockUserProfile
      )

      expect(result).toBeDefined()
      expect(result.workout).toBe(mockWorkouts[0])
      expect(result.overallAlignment).toBeGreaterThan(0)
      expect(result.exerciseAnalyses).toBeDefined()
      expect(result.exerciseAnalyses.length).toBe(2)
    })

    it('should analyze workout for strength gain goal', async () => {
      const result = await GoalBasedAnalysisService['analyzeWorkoutForGoal'](
        mockWorkouts[0],
        'strength_gain',
        mockUserProfile
      )

      expect(result).toBeDefined()
      expect(result.exerciseAnalyses).toBeDefined()
      
      // Should prefer compound exercises for strength
      const compoundExercises = result.exerciseAnalyses.filter(
        analysis => GoalBasedAnalysisService['isCompoundExercise'](analysis.exercise.exercise.name)
      )
      expect(compoundExercises.length).toBeGreaterThan(0)
    })

    it('should identify suboptimal parameters', async () => {
      const highRepWorkout: Workout = {
        ...mockWorkouts[0],
        exercises: [
          {
            ...mockWorkouts[0].exercises[0],
            reps: '20-25', // Too high for muscle gain
            sets: 2, // Too low for muscle gain
            rest_time: 30 // Too short for muscle gain
          }
        ]
      }

      const result = await GoalBasedAnalysisService['analyzeWorkoutForGoal'](
        highRepWorkout,
        'muscle_gain',
        mockUserProfile
      )

      expect(result.exerciseAnalyses[0].isOptimal).toBe(false)
      expect(result.exerciseAnalyses[0].suggestions.length).toBeGreaterThan(0)
    })
  })

  describe('analyzeExerciseForGoal', () => {
    it('should analyze exercise for muscle gain', () => {
      const goalParams = GoalBasedAnalysisService['goalParameters']['muscle_gain']
      const exercise = mockWorkouts[0].exercises[0]

      const result = GoalBasedAnalysisService['analyzeExerciseForGoal'](
        exercise,
        goalParams,
        mockUserProfile
      )

      expect(result).toBeDefined()
      expect(result.exercise).toBe(exercise)
      expect(result.alignmentScore).toBeGreaterThanOrEqual(0)
      expect(result.alignmentScore).toBeLessThanOrEqual(1)
    })

    it('should suggest parameter changes when needed', () => {
      const goalParams = GoalBasedAnalysisService['goalParameters']['strength_gain']
      const exercise: WorkoutExercise = {
        ...mockWorkouts[0].exercises[0],
        reps: '15-20', // Too high for strength
        sets: 2, // Too low for strength
        rest_time: 60 // Too short for strength
      }

      const result = GoalBasedAnalysisService['analyzeExerciseForGoal'](
        exercise,
        goalParams,
        mockUserProfile
      )

      expect(result.suggestions.length).toBeGreaterThan(0)
      expect(result.isOptimal).toBe(false)
      expect(result.reasonsForChange.length).toBeGreaterThan(0)
    })

    it('should handle optimal exercises', () => {
      const goalParams = GoalBasedAnalysisService['goalParameters']['muscle_gain']
      const optimalExercise: WorkoutExercise = {
        ...mockWorkouts[0].exercises[0],
        reps: '10', // Perfect for muscle gain
        sets: 3, // Perfect for muscle gain
        rest_time: 120 // Perfect for muscle gain
      }

      const result = GoalBasedAnalysisService['analyzeExerciseForGoal'](
        optimalExercise,
        goalParams,
        mockUserProfile
      )

      expect(result.isOptimal).toBe(true)
      expect(result.alignmentScore).toBeGreaterThan(0.8)
    })
  })

  describe('generateRecommendedChanges', () => {
    it('should generate volume adjustments', () => {
      const mockAnalyses = [
        {
          workout: mockWorkouts[0],
          overallAlignment: 0.5, // Below threshold
          exerciseAnalyses: [],
          recommendedChanges: [],
          priorityAreas: []
        }
      ]

      const goalParams = GoalBasedAnalysisService['goalParameters']['muscle_gain']
      
      const result = GoalBasedAnalysisService['generateRecommendedChanges'](
        mockAnalyses,
        goalParams,
        mockUserProfile
      )

      expect(result).toBeDefined()
      expect(result.volume_adjustment).toBeDefined()
      expect(result.intensity_adjustment).toBeDefined()
      expect(result.frequency_adjustment).toBeDefined()
    })

    it('should recommend minimal changes for well-aligned workouts', () => {
      const mockAnalyses = [
        {
          workout: mockWorkouts[0],
          overallAlignment: 0.9, // High alignment
          exerciseAnalyses: [],
          recommendedChanges: [],
          priorityAreas: []
        }
      ]

      const goalParams = GoalBasedAnalysisService['goalParameters']['muscle_gain']
      
      const result = GoalBasedAnalysisService['generateRecommendedChanges'](
        mockAnalyses,
        goalParams,
        mockUserProfile
      )

      expect(Math.abs(result.volume_adjustment)).toBeLessThan(0.3)
      expect(Math.abs(result.intensity_adjustment)).toBeLessThan(0.3)
    })
  })

  describe('identifyPriorityMuscleGroups', () => {
    it('should identify priority groups for muscle gain', () => {
      const result = GoalBasedAnalysisService['identifyPriorityMuscleGroups'](
        'muscle_gain',
        mockWorkouts
      )

      expect(result).toBeDefined()
      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBeGreaterThan(0)
      expect(result).toContain('chest')
      expect(result).toContain('back')
      expect(result).toContain('legs')
    })

    it('should prioritize compound movement groups for strength', () => {
      const result = GoalBasedAnalysisService['identifyPriorityMuscleGroups'](
        'strength_gain',
        mockWorkouts
      )

      expect(result).toContain('chest')
      expect(result).toContain('back')
      expect(result).toContain('legs')
    })

    it('should prioritize calorie-burning groups for fat loss', () => {
      const result = GoalBasedAnalysisService['identifyPriorityMuscleGroups'](
        'fat_loss',
        mockWorkouts
      )

      expect(result).toContain('legs')
      expect(result).toContain('back')
    })
  })

  describe('identifyAvoidMuscleGroups', () => {
    it('should identify groups to avoid for injured users', () => {
      const injuredProfile = {
        ...mockUserProfile,
        injury_history: ['lower_back', 'knee'],
        limitations: ['avoid_heavy_squats']
      }

      const result = GoalBasedAnalysisService['identifyAvoidMuscleGroups'](
        'rehabilitation',
        injuredProfile
      )

      expect(result).toBeDefined()
      expect(Array.isArray(result)).toBe(true)
    })

    it('should return empty array for healthy users', () => {
      const result = GoalBasedAnalysisService['identifyAvoidMuscleGroups'](
        'muscle_gain',
        mockUserProfile
      )

      expect(result).toEqual([])
    })
  })

  describe('helper methods', () => {
    it('should parse reps range correctly', () => {
      expect(GoalBasedAnalysisService['parseRepsRange']('10')).toBe(10)
      expect(GoalBasedAnalysisService['parseRepsRange']('8-12')).toBe(8)
      expect(GoalBasedAnalysisService['parseRepsRange']('10-15')).toBe(10)
    })

    it('should identify compound exercises', () => {
      expect(GoalBasedAnalysisService['isCompoundExercise']('Supino Reto')).toBe(true)
      expect(GoalBasedAnalysisService['isCompoundExercise']('Agachamento')).toBe(true)
      expect(GoalBasedAnalysisService['isCompoundExercise']('Rosca Bíceps')).toBe(false)
      expect(GoalBasedAnalysisService['isCompoundExercise']('Extensão Tríceps')).toBe(false)
    })

    it('should estimate workout duration', () => {
      const duration = GoalBasedAnalysisService['estimateWorkoutDuration'](mockWorkouts[0])
      expect(duration).toBeGreaterThan(0)
      expect(duration).toBeLessThan(200) // Reasonable duration
    })
  })

  describe('goal parameters', () => {
    it('should have correct parameters for muscle gain', () => {
      const params = GoalBasedAnalysisService['goalParameters']['muscle_gain']
      
      expect(params.optimalRepsRange).toEqual([8, 12])
      expect(params.optimalSetsRange).toEqual([3, 5])
      expect(params.optimalRestTime).toEqual([120, 180])
      expect(params.intensityLevel).toBe('medium')
      expect(params.progressionStrategy).toBe('volume')
    })

    it('should have correct parameters for strength gain', () => {
      const params = GoalBasedAnalysisService['goalParameters']['strength_gain']
      
      expect(params.optimalRepsRange).toEqual([3, 6])
      expect(params.optimalSetsRange).toEqual([3, 6])
      expect(params.optimalRestTime).toEqual([180, 300])
      expect(params.intensityLevel).toBe('high')
      expect(params.progressionStrategy).toBe('intensity')
    })

    it('should have correct parameters for fat loss', () => {
      const params = GoalBasedAnalysisService['goalParameters']['fat_loss']
      
      expect(params.optimalRepsRange).toEqual([12, 20])
      expect(params.optimalRestTime).toEqual([45, 90])
      expect(params.weeklyFrequency).toEqual([4, 6])
    })
  })

  describe('consolidateRecommendations', () => {
    it('should consolidate and rank recommendations', () => {
      const mockAnalyses = [
        {
          workout: mockWorkouts[0],
          overallAlignment: 0.7,
          exerciseAnalyses: [],
          recommendedChanges: [
            {
              type: 'modify_parameters' as const,
              target_exercise_id: 'ex-1',
              parameter_changes: { reps: '10' },
              reason: 'Optimize reps for goal',
              impact_score: 8
            },
            {
              type: 'add_exercise' as const,
              reason: 'Add compound exercise',
              impact_score: 6
            }
          ],
          priorityAreas: []
        }
      ]

      const result = GoalBasedAnalysisService['consolidateRecommendations'](mockAnalyses)

      expect(result).toBeDefined()
      expect(result.length).toBeLessThanOrEqual(10)
      expect(result[0].impact_score).toBeGreaterThanOrEqual(result[result.length - 1].impact_score)
    })

    it('should remove duplicate recommendations', () => {
      const mockAnalyses = [
        {
          workout: mockWorkouts[0],
          overallAlignment: 0.7,
          exerciseAnalyses: [],
          recommendedChanges: [
            {
              type: 'modify_parameters' as const,
              target_exercise_id: 'ex-1',
              parameter_changes: { reps: '10' },
              reason: 'Optimize reps for goal',
              impact_score: 8
            },
            {
              type: 'modify_parameters' as const,
              target_exercise_id: 'ex-1',
              parameter_changes: { reps: '10' },
              reason: 'Optimize reps for goal',
              impact_score: 8
            }
          ],
          priorityAreas: []
        }
      ]

      const result = GoalBasedAnalysisService['consolidateRecommendations'](mockAnalyses)

      expect(result.length).toBe(1)
    })
  })

  describe('edge cases', () => {
    it('should handle empty workouts', async () => {
      const result = await GoalBasedAnalysisService.analyzeGoalAlignment(
        [],
        mockUserProfile
      )

      expect(result.goal).toBe('muscle_gain')
      expect(result.current_workout_alignment).toBe(0)
      expect(result.recommendations.length).toBe(0)
    })

    it('should handle workouts with no exercises', async () => {
      const emptyWorkout: Workout = {
        id: '1',
        name: 'Empty Workout',
        description: 'No exercises',
        created_by: 'user-1',
        exercises: []
      }

      const result = await GoalBasedAnalysisService.analyzeGoalAlignment(
        [emptyWorkout],
        mockUserProfile
      )

      expect(result.current_workout_alignment).toBe(0)
    })

    it('should handle null/undefined parameters', () => {
      const exercise = {
        ...mockWorkouts[0].exercises[0],
        rest_time: null
      }

      const goalParams = GoalBasedAnalysisService['goalParameters']['muscle_gain']
      
      const result = GoalBasedAnalysisService['analyzeExerciseForGoal'](
        exercise,
        goalParams,
        mockUserProfile
      )

      expect(result).toBeDefined()
      expect(result.alignmentScore).toBeGreaterThan(0)
    })
  })
}) 